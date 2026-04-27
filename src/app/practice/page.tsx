"use client";

import { useState, useEffect, useRef } from "react";
import { Trophy, Timer, Flame, Play, CheckCircle2, AlertCircle, BrainCircuit } from "lucide-react";
import { io, Socket } from "socket.io-client";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], 
  [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
];

// Use the words your model actually knows!
const practiceWords = ["HELLO", "THANKS"];

export default function PracticePage() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "success" | "failed">("idle");
  const [currentWord, setCurrentWord] = useState("HELLO");
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  // AI & Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isAILoaded, setIsAILoaded] = useState(false);
  
  // Use a ref for gameState so the socket listener always has the freshest value
  const gameStateRef = useRef(gameState);
  const currentWordRef = useRef(currentWord);

  useEffect(() => {
    gameStateRef.current = gameState;
    currentWordRef.current = currentWord;
  }, [gameState, currentWord]);

  // 1. Initialize WebSockets & AI Logic
  useEffect(() => {
    // 🚀 CONNECTING TO THE LIVE RENDER BACKEND
    socketRef.current = io("https://signsync-api.onrender.com", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5
    });

    socketRef.current.on("prediction", (data: { word: string; confidence: number }) => {
      const translatedWord = data.word.toUpperCase();
      
      // THE GAME LOGIC: Did they sign the correct word while playing?
      if (
        gameStateRef.current === "playing" && 
        translatedWord === currentWordRef.current && 
        data.confidence > 0.80
      ) {
        handleWin();
      }
    });

    return () => { socketRef.current?.disconnect(); };
  }, []);

  // 2. Load MediaPipe
  useEffect(() => {
    const loadScript = (src: string) => new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      document.head.appendChild(script);
    });

    const initScripts = async () => {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
      setIsAILoaded(true);
    };

    initScripts();
  }, []);

  // 3. Main Camera Loop
  useEffect(() => {
    if (!isAILoaded) return;

    let isCameraActive = true; 

    // @ts-ignore
    const hands = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: any) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvasCtx = canvasRef.current.getContext("2d");
      if (!canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // @ts-ignore
        window.drawConnectors(canvasCtx, landmarks, CONNECTIONS, { color: "#22d3ee", lineWidth: 3 }); 
        // @ts-ignore
        window.drawLandmarks(canvasCtx, landmarks, { color: "#ffffff", lineWidth: 1, radius: 2 });

        if (gameStateRef.current === "playing" && socketRef.current) {
          const flatFrame = landmarks.flatMap((p: any) => [p.x, p.y, p.z]);
          socketRef.current.emit("process_landmarks", flatFrame);
        }
      }
      canvasCtx.restore();
    });

    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        
        if (!videoRef.current || !isCameraActive) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const sendFramesToAI = async () => {
          if (!isCameraActive) return; 
          if (videoRef.current && !videoRef.current.paused) {
            try {
              await hands.send({ image: videoRef.current });
            } catch (e) {} 
          }
          if (isCameraActive) {
            requestAnimationFrame(sendFramesToAI);
          }
        };
        videoRef.current.onloadeddata = () => sendFramesToAI();
      } catch (error) {
        console.error("Camera access failed:", error);
      }
    };

    startCamera();

    return () => {
      isCameraActive = false; 
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (hands) {
        try { hands.close(); } catch (e) {}
      }
    };
  }, [isAILoaded]);

  // The Game Loop (Timer)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "playing" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === "playing") {
      setGameState("failed");
      setStreak(0);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const startGame = () => {
    const randomWord = practiceWords[Math.floor(Math.random() * practiceWords.length)];
    setCurrentWord(randomWord);
    setTimeLeft(10);
    setGameState("playing");
  };

  const handleWin = () => {
    setGameState("success");
    setScore(s => s + 100 + (streak * 10));
    setStreak(s => s + 1);
    
    // Play a happy chime sound!
    const audio = new Audio("https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3");
    audio.play().catch(() => {}); // Catch error if browser blocks autoplay

    setTimeout(startGame, 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 animate-fade-in-up font-sans relative z-10">
      
      {/* Top Stats Bar */}
      <div className="flex justify-between items-center bg-white/[0.02] backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors mt-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] rounded-full" />
          <h1 className="text-xl md:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 uppercase drop-shadow-sm">
            Training Arena
          </h1>
        </div>

        <div className="relative z-10 flex gap-6 md:gap-8">
          <div className="flex items-center gap-3">
            <Flame className={`w-6 h-6 ${streak > 0 ? "text-orange-500 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" : "text-slate-600"}`} />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase leading-none mb-1">Streak</span>
              <span className="text-xl font-bold text-slate-200 leading-none">{streak}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase leading-none mb-1">Score</span>
              <span className="text-xl font-bold text-slate-200 leading-none">{score}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        
        {/* LEFT SIDE: The Game HUD (Spans 7 cols) */}
        <div className="col-span-1 md:col-span-7 flex flex-col gap-6">
          <div className={`relative overflow-hidden border rounded-[2rem] p-8 flex flex-col items-center justify-center min-h-[400px] transition-all duration-500 backdrop-blur-xl ${
            gameState === "success" ? "bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_50px_-10px_rgba(34,211,238,0.3)]" :
            gameState === "failed" ? "bg-red-950/20 border-red-500/40 shadow-[0_0_50px_-10px_rgba(239,68,68,0.3)]" :
            "bg-white/[0.02] border-white/5 shadow-2xl hover:border-white/10"
          }`}>
            
            {gameState === "idle" ? (
              <div className="text-center flex flex-col items-center z-10 animate-fade-in-up">
                <BrainCircuit className="w-20 h-20 text-purple-500 mb-6 opacity-80 drop-shadow-[0_0_25px_rgba(168,85,247,0.6)]" />
                <h2 className="text-3xl font-black text-white mb-8 tracking-tighter">Ready to synchronize?</h2>
                <button 
                  onClick={startGame}
                  className="group relative px-10 py-5 rounded-[1.5rem] font-black tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden bg-white/[0.02] border border-purple-500/30 text-white hover:border-purple-500/80 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] flex items-center gap-3 backdrop-blur-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Play className="w-5 h-5 fill-cyan-400 text-cyan-400 relative z-10" />
                  <span className="relative z-10">Initiate Sequence</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full relative z-10 animate-fade-in-up">
                <span className="text-cyan-400 font-mono tracking-[0.3em] uppercase mb-4 text-xs drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                  Match Neural Pattern:
                </span>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-8 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] uppercase">
                  {currentWord}
                </h2>
                
                {gameState === "success" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-md rounded-[2rem] animate-fade-in border border-cyan-500/30">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-24 h-24 text-cyan-400 mb-6 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                      <h3 className="text-3xl font-black text-cyan-400 tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] uppercase">Sync Complete</h3>
                    </div>
                  </div>
                )}
                
                {gameState === "failed" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-md rounded-[2rem] animate-fade-in border border-red-500/30">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                      <h3 className="text-3xl font-black text-red-500 tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] uppercase">Connection Lost</h3>
                      <button 
                        onClick={startGame} 
                        className="mt-8 px-8 py-4 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] hover:border-white/20 text-white rounded-[1rem] font-bold transition-all backdrop-blur-md uppercase text-xs tracking-widest"
                      >
                        Restart Sequence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Glowing Laser Timer */}
            {gameState === "playing" && (
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/[0.02]">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(168,85,247,0.8)] ${timeLeft > 3 ? "bg-gradient-to-r from-cyan-400 to-purple-500" : "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)]"}`}
                  style={{ width: `${(timeLeft / 10) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: Camera & Params (Spans 5 cols) */}
        <div className="col-span-1 md:col-span-5 flex flex-col gap-6">
          <div className="relative flex justify-center items-center bg-slate-950/40 backdrop-blur-sm rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 aspect-[4/3] w-full group transition-all duration-500 hover:border-purple-500/30 hover:shadow-[0_0_40px_-15px_rgba(168,85,247,0.3)]">
            
            {!isAILoaded && (
              <div className="absolute z-10 flex flex-col items-center">
                 <div className="w-10 h-10 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
                 <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">Visual Cortex</span>
              </div>
            )}
            
            <video ref={videoRef} className="hidden" playsInline />
            <canvas ref={canvasRef} width="640" height="480" className={`w-full h-full object-cover ${isAILoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`} />
            
            {/* Live Recording Dot */}
            {gameState === "playing" && (
              <div className="absolute top-6 right-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-full text-[10px] font-mono tracking-widest animate-pulse flex items-center gap-3 backdrop-blur-md">
                <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
                LIVE
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors flex-1">
             <h3 className="relative text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-3 z-10">
               <Timer className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
               Parameters
             </h3>
             <ul className="text-xs font-mono text-slate-400 space-y-4 relative z-10">
               <li className="flex items-start gap-3 bg-slate-950/30 p-3 rounded-xl border border-white/5">
                 <span className="text-purple-400 font-bold">01</span> 
                 <span className="leading-relaxed">10 seconds allocated per translation sequence.</span>
               </li>
               <li className="flex items-start gap-3 bg-slate-950/30 p-3 rounded-xl border border-white/5">
                 <span className="text-cyan-400 font-bold">02</span> 
                 <span className="leading-relaxed">Neural model requires 80% confidence match.</span>
               </li>
               <li className="flex items-start gap-3 bg-slate-950/30 p-3 rounded-xl border border-white/5">
                 <span className="text-fuchsia-400 font-bold">03</span> 
                 <span className="leading-relaxed">Chain successful syncs for score multipliers.</span>
               </li>
             </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
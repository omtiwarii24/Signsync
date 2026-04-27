"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Spline from '@splinetool/react-spline';

// IMPORTING YOUR NEW PAGES
import DictionaryPage from "../app/dictionary/page"; 
import PracticePage from "../app/practice/page";
import SettingsPage from "../app/settings/page";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], 
  [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
];

const HandTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAILoaded, setIsAILoaded] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState("Translate");

  // Data Collection State
  const [signLabel, setSignLabel] = useState("");
  const [isRecordingUI, setIsRecordingUI] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const isRecordingRef = useRef(false);
  const framesRef = useRef<number[][]>([]);
  const labelRef = useRef("");

  // Live Translation State
  const socketRef = useRef<Socket | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const isLiveModeRef = useRef(false);
  
  const [translation, setTranslation] = useState("Waiting for sign...");
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  
  const rawWordsRef = useRef<string[]>([]);
  const smoothTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const lastWordRef = useRef<string>(""); 

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    const savedVoiceURI = localStorage.getItem("signsync_voice");
    if (savedVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const activeVoice = voices.find(v => v.voiceURI === savedVoiceURI);
      if (activeVoice) utterance.voice = activeVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // 🚀 CONNECTING TO THE LIVE RENDER BACKEND
    socketRef.current = io("https://signsync-api.onrender.com", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5
    });

    socketRef.current.on("prediction", async (data: { word: string; confidence: number }) => {
      const savedConfidence = localStorage.getItem("signsync_confidence");
      const strictness = savedConfidence ? parseInt(savedConfidence) / 100 : 0.85; 
      
      const debugStrictness = 0.0; 
      if (data.confidence < debugStrictness) return;

      const translatedWord = data.word.toUpperCase();
      if (translatedWord === "IDLE") {
        lastWordRef.current = "IDLE"; 
        return;
      }
      if (translatedWord === lastWordRef.current) return;
      lastWordRef.current = translatedWord;

      setTranslation(`🗣️ ${translatedWord}`);
      setConfidence(data.confidence);
      setHistory(prev => [translatedWord, ...prev].slice(0, 4));
      rawWordsRef.current.push(translatedWord);

      if (smoothTimerRef.current) clearTimeout(smoothTimerRef.current);
      
      smoothTimerRef.current = setTimeout(async () => {
        const wordsToSmooth = [...rawWordsRef.current];
        if (wordsToSmooth.length > 1) {
          rawWordsRef.current = []; 
          lastWordRef.current = "";
          setIsThinking(true);
          setTranslation("✨ Decoding sequence...");
          
          try {
            const res = await fetch("/api/smooth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ words: wordsToSmooth })
            });
            const aiData = await res.json();
            if (aiData.sentence) {
              setTranslation(`✨ "${aiData.sentence}"`);
              speak(aiData.sentence);
            }
          } catch (err) {
            console.error("Failed to smooth text", err);
          } finally {
            setIsThinking(false);
            setTimeout(() => {
              setTranslation("Waiting for sign...");
              setConfidence(0);
            }, 8000); 
          }
        } else if (wordsToSmooth.length === 1) {
          const singleWord = wordsToSmooth[0];
          rawWordsRef.current = [];
          lastWordRef.current = "";
          setTranslation(`🗣️ ${singleWord}`);
          speak(singleWord);
          setTimeout(() => {
            setTranslation("Waiting for sign...");
            setConfidence(0);
          }, 2000);
        }
      }, 5000); 
    });

    return () => { socketRef.current?.disconnect(); };
  }, []);

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
      if (activeTab !== "Translate") return;

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

        const flatFrame = landmarks.flatMap((p: any) => [p.x, p.y, p.z]);

        if (isRecordingRef.current) {
          framesRef.current.push(flatFrame);
          setFrameCount(framesRef.current.length);

          if (framesRef.current.length >= 30) {
            isRecordingRef.current = false;
            setIsRecordingUI(false);
            downloadData(framesRef.current, labelRef.current);
            framesRef.current = [];
            setTimeout(() => setFrameCount(0), 1000);
          }
        } else if (isLiveModeRef.current && socketRef.current) {
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

    if (activeTab === "Translate") {
      startCamera();
    }

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
  }, [isAILoaded, activeTab]);

  const startRecording = () => {
    if (!signLabel.trim()) return alert("Please enter a sign name!");
    labelRef.current = signLabel.toLowerCase().trim();
    framesRef.current = [];
    isRecordingRef.current = true;
    setIsRecordingUI(true);
    setFrameCount(0);
  };

  const toggleLiveMode = () => {
    const newMode = !isLiveMode;
    setIsLiveMode(newMode);
    isLiveModeRef.current = newMode;
    if (newMode) {
      setTranslation("Waiting for sign...");
      setConfidence(0);
      rawWordsRef.current = [];
    }
  };

  const downloadData = (data: number[][], label: string) => {
    const blob = new Blob([JSON.stringify({ label, sequence: data })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}_seq_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="relative min-h-screen w-full bg-[#030303] text-slate-200 overflow-hidden font-sans selection:bg-purple-500/30">
      
      {/* 🌌 THE 3D MATRIX BACKGROUND 🌌 */}
      <div className="absolute inset-0 w-full h-full z-0 opacity-70">
        <Spline scene="https://prod.spline.design/LhVDp6AQTXoG5DOm/scene.splinecode" />
      </div>

      {/* 🌌 THE EXISTING COSMIC EFFECTS */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-gradient-to-b from-purple-600/30 via-fuchsia-600/10 to-transparent blur-[100px] rounded-full pointer-events-none opacity-80 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 📱 TOP NAVBAR */}
      <nav className="relative z-50 w-full flex justify-center pt-6 px-4">
        <div className="flex items-center justify-between w-full max-w-5xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] rounded-full px-6 py-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          {/* Logo */}
          <div className="font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            SignSync
          </div>
          
          {/* Smart Tabs */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-400">
            {["Translate", "Dictionary", "Practice", "Settings"].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full transition-all duration-300 ${
                  activeTab === tab 
                    ? "bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
                    : "hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Status Pill */}
          <div className="flex items-center gap-2 bg-slate-950/50 border border-white/5 rounded-full px-4 py-1.5 shadow-inner">
            <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isLiveMode ? "bg-emerald-400 text-emerald-400" : "bg-purple-500 text-purple-500"}`}></span>
            <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase">
              {isLiveMode ? "Neural Link Active" : "System Standby"}
            </span>
          </div>
        </div>
      </nav>

      {/* 🚀 MAIN CONTENT AREA */}
      <main className="relative z-10 flex flex-col items-center w-full max-w-5xl mx-auto gap-8 pt-12 pb-24 px-4">
        
        {/* TRANSLATE TAB */}
        {activeTab === "Translate" && (
          <>
            <div className="w-full flex flex-col items-center text-center space-y-6 mb-4 animate-fade-in-up">
              <p className="text-xs font-mono tracking-[0.3em] text-slate-500 uppercase">Neural Translation Output</p>
              <h2 className={`text-5xl md:text-7xl font-black tracking-tighter uppercase min-h-[5rem] flex items-center justify-center transition-all duration-500 ${isThinking ? "text-cyan-300 animate-pulse drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]" : "text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"}`}>
                {translation}
              </h2>
              
              <div className="w-full max-w-md flex flex-col items-center gap-3">
                <div className="w-full bg-white/[0.02] rounded-full h-1 overflow-hidden border border-white/5 shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ease-out ${isThinking ? "bg-cyan-400 animate-pulse w-full shadow-[0_0_15px_rgba(34,211,238,1)]" : "bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]"}`}
                    style={{ width: isThinking ? "100%" : `${Math.max(confidence * 100, 5)}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-[0.2em] uppercase">
                   {isThinking ? "Synthesizing Context..." : `Confidence Level: ${(confidence * 100).toFixed(1)}%`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full animate-fade-in-up">
              <div className="col-span-1 md:col-span-8 flex flex-col gap-4">
                <div className="relative flex justify-center items-center bg-slate-950/40 backdrop-blur-sm rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 aspect-[4/3] w-full group transition-all duration-500 hover:border-purple-500/30 hover:shadow-[0_0_40px_-15px_rgba(168,85,247,0.3)]">
                  
                  {!isAILoaded && (
                    <div className="absolute z-10 flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                      <span className="text-[10px] font-mono text-purple-400 tracking-widest uppercase">Initializing Cortex</span>
                    </div>
                  )}
                  
                  <video ref={videoRef} className="hidden" playsInline />
                  <canvas ref={canvasRef} width="640" height="480" className={`w-full h-full object-cover ${isAILoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`} />
                  
                  {isRecordingUI && (
                    <div className="absolute top-6 right-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-full text-[10px] font-mono tracking-widest animate-pulse flex items-center gap-3 backdrop-blur-md">
                      <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
                      REC {frameCount}/30
                    </div>
                  )}
                </div>

                {isAILoaded && (
                  <button
                    onClick={toggleLiveMode}
                    disabled={isRecordingUI}
                    className={`w-full py-5 rounded-[1.5rem] font-black text-xs tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden group ${
                      isLiveMode 
                        ? "bg-white/5 border border-purple-500/50 text-white shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)]" 
                        : "bg-white/[0.02] border border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-400/20 opacity-0 transition-opacity duration-500 ${isLiveMode ? "opacity-100" : "group-hover:opacity-100"}`} />
                    <span className="relative z-10">{isLiveMode ? "Disconnect Neural Link" : "Initialize Neural Link"}</span>
                  </button>
                )}
              </div>

              <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex-1 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
                  <h3 className="relative text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
                    Neural History
                  </h3>
                  
                  <div className="relative flex flex-col gap-3 z-10">
                    {history.length === 0 ? (
                      <p className="text-slate-600 text-xs font-mono mt-2">Awaiting stream...</p>
                    ) : (
                      history.map((word, i) => (
                        <div key={i} className="bg-slate-950/50 border border-white/5 px-5 py-3.5 rounded-2xl text-slate-200 font-bold text-sm tracking-wide animate-fade-in-up flex items-center justify-between transition-all hover:bg-white/5 hover:border-white/10 hover:-translate-y-0.5">
                          <span>{word}</span>
                          <span className="text-[9px] text-purple-500 font-mono tracking-widest">{`0${i + 1}`}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {!isLiveMode && isAILoaded && (
                  <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col gap-4 relative overflow-hidden group hover:border-white/10 transition-colors">
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 z-10">Expand Dictionary</h3>
                    
                    <input
                      type="text"
                      value={signLabel}
                      onChange={(e) => setSignLabel(e.target.value)}
                      disabled={isRecordingUI}
                      className="relative z-10 w-full bg-slate-950/50 text-white font-mono text-xs px-5 py-4 rounded-[1rem] border border-white/5 focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="Enter token name..."
                    />
                    <button
                      onClick={startRecording}
                      disabled={isRecordingUI}
                      className={`relative z-10 w-full py-4 rounded-[1rem] font-bold tracking-widest uppercase text-[10px] transition-all ${
                        isRecordingUI 
                          ? "bg-slate-900 text-slate-500 cursor-not-allowed border border-white/5" 
                          : "bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/40 text-purple-200 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]"
                      }`}
                    >
                      {isRecordingUI ? "Capturing..." : "Capture Sequence"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* --- INJECTING YOUR NEW MODULES --- */}
        {activeTab === "Dictionary" && <DictionaryPage />}
        {activeTab === "Practice" && <PracticePage />}
        {activeTab === "Settings" && <SettingsPage />}

      </main>
    </div>
  );
};

export default HandTracker;
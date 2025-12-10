"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Settings, 
  MessageSquare, 
  Users, 
  Info,
  ChevronDown,
  FileUp,
  FileText,
  Loader2,
  X,
  CheckCircle,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Interview } from "@/types/interview";
import { toast } from "sonner";
import Vapi from "@vapi-ai/web";
import axios from "axios";
import { ResponseService } from "@/services/responses.service";
import { FeedbackService } from "@/services/feedback.service";
import { useResponses } from "@/contexts/responses.context";
import { FeedbackData } from "@/types/response";
import { Textarea } from "@/components/ui/textarea";
import { 
  useTabSwitchPrevention,
  TabSwitchWarning 
} from "./tabSwitchPrevention";
import { createClient } from "@supabase/supabase-js";

const vapiClient = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "");

// Transcript message type
interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Call state type
type CallState = "lobby" | "connecting" | "connected" | "ended";

interface VideoInterviewExperienceProps {
  interview: Interview;
  interviewerName?: string;
  interviewerAvatar?: string;
  organizationLogo?: string;
}

export default function VideoInterviewExperience({ 
  interview, 
  interviewerName = "Alex",
  interviewerAvatar = "/default-interviewer.svg",
  organizationLogo,
}: VideoInterviewExperienceProps) {
  const { createResponse } = useResponses();
  
  // Call state
  const [callState, setCallState] = useState<CallState>("lobby");
  const [callId, setCallId] = useState<string>("");
  
  // Media state
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<"strong" | "medium" | "weak">("strong");
  
  // Device selection
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [showDeviceDropdown, setShowDeviceDropdown] = useState<"video" | "audio" | null>(null);
  
  // User info
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  
  // CV Upload
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvParsedText, setCvParsedText] = useState<string>("");
  const [cvStorageUrl, setCvStorageUrl] = useState<string>("");
  const [isParsingCv, setIsParsingCv] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);
  
  // Transcript
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  
  // Speaking indicators
  const [isSpeaking, setIsSpeaking] = useState<"user" | "assistant" | null>(null);
  const [assistantText, setAssistantText] = useState<string>("");
  
  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRefConnected = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Tab switch tracking
  const { tabSwitchCount, tabSwitchEvents } = useTabSwitchPrevention({
    isTracking: callState === "connected"
  });
  const tabSwitchCountRef = useRef(tabSwitchCount);
  const tabSwitchEventsRef = useRef(tabSwitchEvents);
  
  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
    tabSwitchEventsRef.current = tabSwitchEvents;
  }, [tabSwitchCount, tabSwitchEvents]);
  
  // Time tracking
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("0:00");
  
  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  // Initialize media devices
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        // Request permissions and get stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setVideoStream(stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Get available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === "videoinput");
        const audioInputs = devices.filter(d => d.kind === "audioinput");
        
        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);
        
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Failed to get media devices:", err);
        toast.error("Please allow camera and microphone access");
      }
    };
    
    initializeMedia();
    
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update video stream when device changes
  const switchVideoDevice = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
      });
      
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      
      setVideoStream(newStream);
      setSelectedVideoDevice(deviceId);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Failed to switch video device:", err);
    }
  };

  // Update audio stream when device changes
  const switchAudioDevice = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
        audio: { deviceId: { exact: deviceId } }
      });
      
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      
      setVideoStream(newStream);
      setSelectedAudioDevice(deviceId);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Failed to switch audio device:", err);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoStream) {
      videoStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      vapiClient.setMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (videoStream) {
      videoStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  // Start video recording
  const startVideoRecording = () => {
    if (!videoStream) return;
    
    try {
      const mediaRecorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      console.log("[VideoRecording] Started recording");
    } catch (err) {
      console.error("[VideoRecording] Failed to start:", err);
    }
  };

  // Stop video recording and upload
  const stopVideoRecording = async () => {
    if (!mediaRecorderRef.current) return null;
    
    return new Promise<string | null>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        
        try {
          // Upload to Supabase
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          const fileName = `${callId}_${Date.now()}.webm`;
          const { data, error } = await supabase.storage
            .from('videos')
            .upload(fileName, blob, {
              contentType: 'video/webm',
              upsert: false
            });
          
          if (error) {
            console.error("[VideoRecording] Upload error:", error);
            resolve(null);
            return;
          }
          
          const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);
          
          console.log("[VideoRecording] Uploaded:", urlData.publicUrl);
          resolve(urlData.publicUrl);
        } catch (err) {
          console.error("[VideoRecording] Upload failed:", err);
          resolve(null);
        }
      };
      
      mediaRecorder.stop();
    });
  };

  // CV Upload handler
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    
    setCvFile(file);
    setIsParsingCv(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('interviewId', interview?.id || '');
      
      const response = await axios.post('/api/upload-candidate-cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setCvParsedText(response.data.parsedText || '');
        setCvStorageUrl(response.data.storageUrl || '');
        toast.success("CV uploaded successfully!");
      } else {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error("CV upload error:", error);
      toast.error(error?.response?.data?.error || "Failed to upload CV");
      setCvFile(null);
    } finally {
      setIsParsingCv(false);
    }
  };

  // Track last transcript to prevent duplicates
  const lastTranscriptRef = useRef<string>("");
  
  // Setup Vapi event handlers
  useEffect(() => {
    // Speaking events
    vapiClient.on("speech-start", () => {
      setIsSpeaking("assistant");
    });
    
    vapiClient.on("speech-end", () => {
      setIsSpeaking(null);
    });
    
    // Transcript events
    vapiClient.on("message", (message: any) => {
      if (message.type === "transcript") {
        if (message.transcriptType === "partial") {
          if (message.role === "assistant") {
            setAssistantText(message.transcript);
          } else {
            setIsSpeaking("user");
          }
        } else if (message.transcriptType === "final") {
          // Prevent duplicate messages
          const messageKey = `${message.role}-${message.transcript}`;
          if (lastTranscriptRef.current === messageKey) {
            return;
          }
          lastTranscriptRef.current = messageKey;
          
          const newMessage: TranscriptMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.transcript,
            timestamp: new Date()
          };
          
          setTranscriptMessages(prev => [...prev, newMessage]);
          setAssistantText("");
          
          if (message.role === "user") {
            setIsSpeaking(null);
          }
          
          // Auto-scroll transcript with smooth behavior
          setTimeout(() => {
            if (transcriptRef.current) {
              transcriptRef.current.scrollTo({
                top: transcriptRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
          }, 100);
        }
      }
    });
    
    // Call events
    vapiClient.on("call-start", () => {
      setCallState("connected");
      setCallStartTime(new Date());
      startVideoRecording();
      
      // Re-attach video stream when call starts
      setTimeout(() => {
        if (videoRefConnected.current && videoStream) {
          videoRefConnected.current.srcObject = videoStream;
        }
      }, 100);
    });
    
    vapiClient.on("call-end", async () => {
      setCallState("ended");
      setIsSpeaking(null);
      
      // Stop recording and upload
      const videoUrl = await stopVideoRecording();
      
      // Save response
      await ResponseService.saveResponse({
        is_ended: true,
        tab_switch_count: tabSwitchCountRef.current,
        tab_switch_events: tabSwitchEventsRef.current.length > 0 ? tabSwitchEventsRef.current : null,
        video_url: videoUrl,
      }, callId);
    });
    
    vapiClient.on("error", (error) => {
      console.error("Vapi error:", error);
      toast.error("Connection error occurred");
      setCallState("lobby");
    });
    
    return () => {
      vapiClient.removeAllListeners();
    };
  }, [callId, videoStream]);

  // Elapsed time counter
  useEffect(() => {
    if (callState !== "connected" || !callStartTime) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setElapsedTime(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [callState, callStartTime]);

  // Join call
  const joinCall = async () => {
    if (!userName || !userEmail) {
      toast.error("Please enter your name and email");
      return;
    }
    
    setCallState("connecting");
    
    try {
      // Register call with backend
      const registerResponse = await axios.post("/api/register-call", {
        interviewer_id: interview.interviewer_id,
        interviewId: interview.id,
        email: userEmail,
        name: userName,
        dynamic_data: {
          name: userName,
          mins: interview.time_duration || "10",
          objective: interview.objective || "",
          job_context: interview.job_context || "",
          questions: interview.questions?.map((q) => q.question).join("\n") || "",
        }
      });
      
      const { call_id, access_token, dynamic_data } = registerResponse.data.registerCallResponse;
      setCallId(call_id);
      
      // Create response record
      const detailsObj: any = {};
      if (cvParsedText) {
        detailsObj.attached_cv = {
          text: cvParsedText,
          url: cvStorageUrl || null,
          fileName: cvFile?.name || null,
        };
      }
      
      await createResponse({
        interview_id: interview.id,
        call_id: call_id,
        email: userEmail,
        name: userName,
        details: Object.keys(detailsObj).length > 0 ? detailsObj : null,
      });
      
      // Start Vapi call
      await vapiClient.start(access_token, {
        variableValues: dynamic_data
      });
      
    } catch (error: any) {
      console.error("Failed to start call:", error);
      toast.error(error?.response?.data?.error || "Failed to start interview");
      setCallState("lobby");
    }
  };

  // End call
  const endCall = () => {
    vapiClient.stop();
  };

  // Render lobby state
  const renderLobby = () => (
    <div className="flex h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left side - Video preview */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo */}
        {organizationLogo && (
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <img src={organizationLogo} alt="Logo" className="h-8" />
          </div>
        )}
        
        {/* Video Preview Card */}
        <div className="relative w-full max-w-2xl aspect-video bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Connection indicator */}
          <div className="absolute top-4 left-4 z-10">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
              connectionQuality === "strong" 
                ? "bg-green-500/20 text-green-400" 
                : connectionQuality === "medium"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
            }`}>
              <Wifi size={12} />
              {connectionQuality === "strong" ? "Strong Connection" : connectionQuality === "medium" ? "Good Connection" : "Weak Connection"}
            </div>
          </div>
          
          {/* Video element */}
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
          />
          
          {/* Video off placeholder */}
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-3xl font-semibold text-white">
                  {userName ? userName[0]?.toUpperCase() : "?"}
                </span>
              </div>
            </div>
          )}
          
          {/* User name badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
              {userName || "You"}
            </span>
            {isMuted && <MicOff size={14} className="text-red-400" />}
          </div>
        </div>
        
        {/* Device Selection */}
        <div className="flex items-center gap-4 mt-6">
          {/* Camera selector */}
          <div className="relative">
            <button 
              onClick={() => setShowDeviceDropdown(showDeviceDropdown === "video" ? null : "video")}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              <Video size={16} />
              <span className="max-w-[120px] truncate">
                {videoDevices.find(d => d.deviceId === selectedVideoDevice)?.label || "Camera"}
              </span>
              <ChevronDown size={14} />
            </button>
            {showDeviceDropdown === "video" && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-800 rounded-lg shadow-xl py-1 z-20">
                {videoDevices.map(device => (
                  <button
                    key={device.deviceId}
                    onClick={() => {
                      switchVideoDevice(device.deviceId);
                      setShowDeviceDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${
                      selectedVideoDevice === device.deviceId ? "text-purple-400" : "text-white"
                    }`}
                  >
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Mic selector */}
          <div className="relative">
            <button 
              onClick={() => setShowDeviceDropdown(showDeviceDropdown === "audio" ? null : "audio")}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              <Mic size={16} />
              <span className="max-w-[120px] truncate">
                {audioDevices.find(d => d.deviceId === selectedAudioDevice)?.label || "Microphone"}
              </span>
              <ChevronDown size={14} />
            </button>
            {showDeviceDropdown === "audio" && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-800 rounded-lg shadow-xl py-1 z-20">
                {audioDevices.map(device => (
                  <button
                    key={device.deviceId}
                    onClick={() => {
                      switchAudioDevice(device.deviceId);
                      setShowDeviceDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${
                      selectedAudioDevice === device.deviceId ? "text-purple-400" : "text-white"
                    }`}
                  >
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Toggle buttons */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              !isVideoOn ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
        </div>
      </div>
      
      {/* Right side - Join panel */}
      <div className="w-96 bg-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Ready to join?</h1>
        
        {/* AI Interviewer Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center mb-3 shadow-lg">
          <img 
            src={interviewerAvatar} 
            alt={interviewerName}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <p className="text-gray-600 mb-6">{interviewerName} is in the call</p>
        
        {/* User info inputs */}
        <div className="w-full space-y-3 mb-6">
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="email"
            placeholder="Your email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        {/* CV Upload */}
        <div className="w-full mb-6">
          <input
            type="file"
            ref={cvInputRef}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleCvUpload}
          />
          
          {!cvFile ? (
            <button
              onClick={() => cvInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              <FileUp size={18} />
              <span>Upload CV (optional)</span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                {isParsingCv ? (
                  <Loader2 size={16} className="text-purple-500 animate-spin" />
                ) : (
                  <CheckCircle size={16} className="text-green-500" />
                )}
                <span className="text-sm text-gray-700 truncate max-w-[180px]">
                  {cvFile.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setCvFile(null);
                  setCvParsedText("");
                  setCvStorageUrl("");
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        
        {/* Join button */}
        <Button
          onClick={joinCall}
          disabled={!userName || !userEmail || isParsingCv}
          className="w-full py-6 text-lg font-medium bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl"
        >
          Join call
        </Button>
        
        {/* Interview info */}
        <p className="text-sm text-gray-500 mt-4 text-center">
          {interview.name}
        </p>
      </div>
    </div>
  );

  // Render connecting state
  const renderConnecting = () => (
    <div className="flex h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Connecting...</h2>
        <p className="text-gray-400">Please wait while we connect you to {interviewerName}</p>
      </div>
    </div>
  );

  // Attach video stream to connected video element
  useEffect(() => {
    if (callState === "connected" && videoRefConnected.current && videoStream) {
      videoRefConnected.current.srcObject = videoStream;
    }
  }, [callState, videoStream]);

  // Render connected state (in-call)
  const renderConnected = () => (
    <div className="flex h-screen max-h-screen w-full bg-slate-900 overflow-hidden">
      {/* Main video area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Video container - takes remaining space */}
        <div className="flex-1 relative p-3 min-h-0">
          {/* Candidate video (large) */}
          <div className={`relative w-full h-full bg-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
            isSpeaking === "user" ? "ring-4 ring-green-500 shadow-lg shadow-green-500/20" : ""
          }`}>
            <video 
              ref={videoRefConnected}
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-300 ${!isVideoOn ? 'opacity-0' : 'opacity-100'}`}
            />
            
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-4xl font-semibold text-white">
                    {userName ? userName[0]?.toUpperCase() : "?"}
                  </span>
                </div>
              </div>
            )}
            
            {/* Name badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 px-2.5 py-1 rounded-lg">
              <span className="text-white text-sm font-medium">{userName}</span>
              {isSpeaking === "user" && (
                <span className="flex gap-0.5">
                  <span className="w-1 h-2.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="w-1 h-2.5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1 h-2.5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                </span>
              )}
            </div>
          </div>
          
          {/* AI Interviewer (small overlay) */}
          <div className={`absolute bottom-6 right-6 w-36 bg-white rounded-xl overflow-hidden shadow-2xl ${
            isSpeaking === "assistant" ? "ring-3 ring-purple-500" : ""
          }`}>
            <div className="aspect-square bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center p-4">
              <img 
                src={interviewerAvatar} 
                alt={interviewerName}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="px-2 py-1.5 bg-white flex items-center justify-between">
              <span className="text-xs font-medium text-gray-800">{interviewerName}</span>
              {isSpeaking === "assistant" && (
                <span className="flex gap-0.5">
                  <span className="w-1 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                  <span className="w-1 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom control bar - fixed height */}
        <div className="h-14 flex-shrink-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-white text-xs">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-gray-500">|</span>
            <span className="truncate max-w-[150px]">{interview.name}</span>
            <span className="text-gray-500">({elapsedTime})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-full transition-colors ${
                isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`p-2.5 rounded-full transition-colors ${
                !isVideoOn ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            
            <button
              onClick={endCall}
              className="px-4 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              <PhoneOff size={18} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Info size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Users size={18} />
            </button>
            <button 
              onClick={() => setShowTranscript(!showTranscript)}
              className={`p-2 transition-colors ${showTranscript ? "text-purple-400" : "text-gray-400 hover:text-white"}`}
            >
              <MessageSquare size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Transcript sidebar */}
      {showTranscript && (
        <div className="w-72 flex-shrink-0 bg-white flex flex-col border-l border-gray-200 h-full max-h-screen">
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <h3 className="font-semibold text-gray-900 text-sm">Live Transcript</h3>
          </div>
          
          <div 
            ref={transcriptRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth min-h-0"
          >
            {transcriptMessages.map((message, index) => (
              <div 
                key={message.id} 
                className="flex flex-col animate-fade-in-up"
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: 'backwards'
                }}
              >
                <span className="text-xs text-gray-500 mb-1 font-medium">
                  {message.role === "assistant" ? interviewerName : userName}
                </span>
                <div className={`p-3 rounded-2xl transition-all duration-300 ${
                  message.role === "assistant" 
                    ? "bg-gray-100 text-gray-800 rounded-tl-sm" 
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm"
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Partial assistant text with typing animation */}
            {assistantText && (
              <div className="flex flex-col animate-fade-in">
                <span className="text-xs text-gray-500 mb-1 font-medium">{interviewerName}</span>
                <div className="p-3 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-sm">
                  <p className="text-sm leading-relaxed">{assistantText}
                    <span className="inline-flex ml-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '300ms' }} />
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <TabSwitchWarning />
    </div>
  );

  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    if (satisfaction === null && feedbackText.trim() === "") {
      return;
    }
    
    try {
      await FeedbackService.submitFeedback({
        interview_id: interview.id,
        satisfaction: satisfaction ?? 1,
        feedback: feedbackText,
        email: userEmail || null,
      });
      setFeedbackSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback");
    }
  };

  // Render ended state
  const renderEnded = () => (
    <div className="flex h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center p-4">
      <div className="text-center bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
        {!showFeedback ? (
          <>
            {/* Success state */}
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Interview Complete! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing the interview with {interviewerName}. 
              We&apos;ll review your responses and be in touch soon!
            </p>
            
            {/* Stats */}
            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{elapsedTime}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{transcriptMessages.filter(m => m.role === "user").length}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Responses</p>
              </div>
            </div>
            
            {/* Feedback button */}
            {interview.show_feedback_form !== false && !feedbackSubmitted && (
              <Button
                onClick={() => setShowFeedback(true)}
                className="w-full py-6 text-lg font-medium bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl mb-4"
              >
                Rate Your Experience
              </Button>
            )}
            
            {feedbackSubmitted && (
              <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Feedback submitted!</span>
              </div>
            )}
            
            <p className="text-sm text-gray-400">
              You can now close this window
            </p>
          </>
        ) : (
          <>
            {/* Feedback form */}
            <button 
              onClick={() => setShowFeedback(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">Rate Your Experience</h3>
            <p className="text-gray-500 text-sm mb-6">How was your interview experience?</p>
            
            {/* Satisfaction emojis */}
            <div className="flex justify-center gap-4 mb-6">
              {[
                { emoji: "😔", label: "Poor", value: 0 },
                { emoji: "😐", label: "Okay", value: 1 },
                { emoji: "😀", label: "Great", value: 2 },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSatisfaction(option.value)}
                  className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 ${
                    satisfaction === option.value 
                      ? "bg-purple-100 ring-2 ring-purple-500 scale-110" 
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-4xl mb-1">{option.emoji}</span>
                  <span className="text-xs text-gray-600">{option.label}</span>
                </button>
              ))}
            </div>
            
            {/* Feedback text */}
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Any additional feedback? (optional)"
              className="mb-6 min-h-[100px] rounded-xl border-gray-200 focus:ring-purple-500 focus:border-purple-500"
            />
            
            {/* Submit button */}
            <Button
              onClick={handleFeedbackSubmit}
              disabled={satisfaction === null && feedbackText.trim() === ""}
              className="w-full py-6 text-lg font-medium bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Feedback
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden">
      {callState === "lobby" && renderLobby()}
      {callState === "connecting" && renderConnecting()}
      {callState === "connected" && renderConnected()}
      {callState === "ended" && renderEnded()}
    </div>
  );
}


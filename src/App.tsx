/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  X, 
  ChevronLeft, 
  Download, 
  Plus, 
  Home, 
  User, 
  Search,
  Maximize2,
  Zap,
  Layers,
  Palette,
  Scissors,
  Share2,
  Split,
  Eye,
  ShieldAlert,
  PlayCircle,
  Trophy,
  Columns2,
  Video,
  Heart,
  Move,
  Layout,
  Sun,
  Mountain,
  Flower,
  BookOpen,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { cn } from './lib/utils';
import { enhanceImage, describeImage, batchEnhance, generateImage, type EnhancementType } from './services/aiService';
import { auth, signInWithGoogle, logOut } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import confetti from 'canvas-confetti';

// --- Types ---
type Tab = 'home' | 'create' | 'edit' | 'profile';
type EditorState = 'idle' | 'uploading' | 'processing' | 'editing';
type ComparisonMode = 'split' | 'side' | 'touch';

interface StudioSet {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
  preview: string;
}

interface EnhancementOption {
  id: EnhancementType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const ENHANCEMENT_OPTIONS: EnhancementOption[] = [
  { id: 'ai_photo_video', label: 'AI Video Prep', icon: <Video className="w-4 h-4" />, description: 'Dynamic Cinematic' },
  { id: 'ai_enhance', label: 'AI Enhance', icon: <Sparkles className="w-4 h-4" />, description: 'Ultra HD Fix' },
  { id: 'studio_pro', label: 'Studio Pro', icon: <Camera className="w-4 h-4" />, description: 'High-End Finish' },
  { id: 'vibrant', label: 'Vibrant', icon: <Palette className="w-4 h-4" />, description: 'Color Boost' },
  { id: 'relight', label: 'Relight', icon: <Zap className="w-4 h-4" />, description: 'Studio Lighting' },
  { id: 'restore', label: 'Restore', icon: <Scissors className="w-4 h-4" />, description: 'Old Photo Fix' },
  { id: 'beautify', label: 'Beautify', icon: <Sparkles className="w-4 h-4" />, description: 'Glow Finish' },
  { id: 'van_gogh', label: 'Van Gogh', icon: <Palette className="w-4 h-4" />, description: 'Post-Impressionist Style' },
  { id: 'sketch', label: 'Art Sketch', icon: <Scissors className="w-4 h-4" />, description: 'Hand-Drawn Look' },
  { id: 'anime', label: 'Anime Style', icon: <PlayCircle className="w-4 h-4" />, description: 'Vibrant Cel-Shaded' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: <Zap className="w-4 h-4" />, description: 'Neon Futuristic' },
  { id: 'vintage_film', label: 'Vintage Film', icon: <Camera className="w-4 h-4" />, description: '35mm Analog Look' },
  { id: 'monochrome', label: 'Monochrome', icon: <Layers className="w-4 h-4" />, description: 'Fine Art B&W' },
];

const STUDIO_SETS: StudioSet[] = [
  { id: 'ethereal', label: 'Ethereal Dream', prompt: 'Transform the environment into a dreamlike ethereal landscape with floating islands and soft pastel clouds, blending the subject naturally into the scene.', icon: <Sparkles className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80' },
  { id: 'minimal', label: 'Modern Minimal', prompt: 'Style the scene as a clean modern minimalist studio with soft natural light and a neutral textured background, focusing on professional architectural clarity.', icon: <Layout className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=200&q=80' },
  { id: 'retro', label: 'Retro Neon', prompt: 'Reimagine the photo in an 80s retro studio aesthetic with heavy neon pink and blue lighting and a dark reflective atmosphere.', icon: <Zap className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=200&q=80' },
  { id: 'greenhouse', label: 'Greenhouse', prompt: 'Project the scene into a lush botanical greenhouse with tropical plants and soft dappled sunlight filtering through glass panels.', icon: <Sparkles className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1530633753560-6310344dcfb8?auto=format&fit=crop&w=200&q=80' },
  { id: 'cyber', label: 'Cyber Lab', prompt: 'Set the photo in a high-tech cyberpunk laboratory environment with glowing data panels and futuristic technical equipment.', icon: <Maximize2 className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=200&q=80' },
  { id: 'luxury', label: 'Urban Penthouse', prompt: 'Relocate the setting to a luxury urban penthouse at sunset with floor-to-ceiling windows and premium interior aesthetics.', icon: <Home className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80' },
  { id: 'arcade', label: 'Retro Arcade', prompt: 'Integrate the subject into a vibrant 80s arcade with glowing neon game cabinets and classic synthwave lighting.', icon: <Zap className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200&q=80' },
  { id: 'underwater', label: 'Deep Blue', prompt: 'Visualize the scene in a surreal underwater environment with deep blue light orbs and soft oceanic floating particles.', icon: <Sparkles className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1551244072-5d12891318ad?auto=format&fit=crop&w=200&q=80' },
  { id: 'desert', label: 'Desert Oasis', prompt: 'Place the scene in a serene desert landscape at sunset with golden sand dunes and warm cinematic lighting.', icon: <Sun className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=200&q=80' },
  { id: 'mars', label: 'Mars Outpost', prompt: 'Re-render the photo at a futuristic Martian base with red dusty plains and dark space visible in the background.', icon: <Mountain className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=200&q=80' },
  { id: 'sakura', label: 'Sakura Garden', prompt: 'Set the subject in a Japanese garden with blooming cherry blossoms and soft, dreamy pink lighting.', icon: <Flower className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=200&q=80' },
  { id: 'noir', label: 'Library Noir', prompt: 'Apply a vintage library noir aesthetic with dark wood bookshelves, targeted desk lighting, and moody cinematic shadows.', icon: <BookOpen className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=200&q=80' },
  { id: 'rainy_tokyo', label: 'Neon Tokyo Rain', prompt: 'Place the subject in a rainy Tokyo alley at night with vibrant neon signs reflecting on wet urban surfaces.', icon: <MapPin className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=200&q=80' },
  { id: 'beach_sunset', label: 'Beach Sunset', prompt: 'Render the photo on a tropical beach at sunset with golden twilight hues, soft waves, and a warm holiday atmosphere.', icon: <Sun className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=80' },
  { id: 'nature_wild', label: 'Wild Nature', prompt: 'Embed the scene into a lush ancient forest with dramatic light beams filtering through a thick green canopy.', icon: <Flower className="w-4 h-4" />, preview: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=200&q=80' },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [editorState, setEditorState] = useState<EditorState>('idle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [activeEnhancement, setActiveEnhancement] = useState<EnhancementType>('ai_enhance');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{captions: string[], hashtags: string[]}>({captions: [], hashtags: []});
  const [description, setDescription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [sliderPos, setSliderPos] = useState(50);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('split');
  const [activeStudioSet, setActiveStudioSet] = useState<string | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(50);
  const [imageHistory, setImageHistory] = useState<Record<string, string>>({});
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [savedEdits, setSavedEdits] = useState<{id: string, url: string, originalUrl: string, timestamp: number}[]>([]);
  
  // --- Load Saved Edits ---
  useEffect(() => {
    const saved = localStorage.getItem('aiphotopro_saved_edits');
    if (saved) {
      try {
        setSavedEdits(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved edits", e);
      }
    }
  }, []);

  // --- Save to LocalStorage ---
  useEffect(() => {
    if (savedEdits.length > 0) {
      localStorage.setItem('aiphotopro_saved_edits', JSON.stringify(savedEdits.slice(0, 15))); // Keep last 15
    }
  }, [savedEdits]);
  
  // Rewarded Ad State
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [pendingDownload, setPendingDownload] = useState<{url: string, name: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth Observer ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Handlers ---
  const triggerDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Photo saved to gallery!", 'success');
    
    // Add to persistent saved edits
    setSavedEdits(prev => {
      const newEdit = {
        id: `edit_${Date.now()}`,
        url,
        originalUrl: originalImage || url,
        timestamp: Date.now()
      };
      // Prevent duplicates
      if (prev.find(e => e.url === url)) return prev;
      return [newEdit, ...prev].slice(0, 15);
    });

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.9 }
    });
  };

  const handleDownloadWithAd = (url: string, name: string) => {
    setPendingDownload({ url, name });
    setIsAdShowing(true);
    setAdCountdown(10); // 10 second ad
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAdShowing && adCountdown > 0) {
      timer = setInterval(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    } else if (isAdShowing && adCountdown === 0) {
      // Auto-unlock or wait for user to click "Get Reward"?
      // User requested "watch till end next download the image"
      // So when countdown hits 0, it should be ready.
    }
    return () => clearInterval(timer);
  }, [isAdShowing, adCountdown]);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    if (!selectedImage) return;
    handleDownloadWithAd(selectedImage, `aiphotopro_edit_${Date.now()}.png`);
  };

  const handleShare = async () => {
    if (!selectedImage) return;
    
    try {
      // Convert base64 to Blob for sharing
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const file = new File([blob], "aiphotopro_edit.png", { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Check out my AI Photo Pro Edit!',
          text: 'Edited with AI Photo Pro Editor',
        });
      } else {
        // Fallback: Copy to clipboard or just show toast
        showToast("Share API not supported. Download the image to share!", 'error');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast("Share cancelled", 'success');
        return;
      }
      showToast("Sharing failed.", 'error');
      console.error(err);
    }
  };

  const handleReset = () => {
    if (selectedImage && imageHistory[selectedImage]) {
      // Find the root original
      let root = selectedImage;
      while (imageHistory[root] && imageHistory[root] !== root) {
        root = imageHistory[root];
      }
      setSelectedImage(root);
      setOriginalImage(root);
      showToast("Reset to original", 'success');
    }
  };

  const handleAnalyze = async (img: string) => {
    setIsAnalyzing(true);
    try {
      const res = await describeImage(img);
      setSuggestions({ captions: res.captions, hashtags: res.hashtags });
      setDescription(res.description);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!generationPrompt.trim()) return;
    
    setIsProcessing(true);
    try {
      const res = await generateImage(generationPrompt);
      setGeneratedImage(res);
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      showToast(err.message || "Generation failed. Try a different prompt.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseGenerated = () => {
    if (!generatedImage) return;
    const base64 = generatedImage;
    setSelectedImage(base64);
    setOriginalImage(base64);
    setImageHistory({ [base64]: base64 });
    setEditorState('editing');
    setActiveTab('edit');
    handleAnalyze(base64);
  };

  const handleOpenSaved = (edit: {url: string, originalUrl: string}) => {
    setSelectedImage(edit.url);
    setOriginalImage(edit.originalUrl);
    setImageHistory({ [edit.url]: edit.originalUrl });
    setEditorState('editing');
    setActiveTab('edit');
    handleAnalyze(edit.url);
    showToast("Opened for re-editing", 'success');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileList: File[] = Array.from(files);
    
    if (fileList.length === 1) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSelectedImage(base64);
        setSelectedImages([base64]);
        setOriginalImage(base64);
        setImageHistory((prev) => ({ ...prev, [base64]: base64 }));
        setEditorState('editing');
        setActiveTab('edit');
        handleAnalyze(base64);
      };
      reader.readAsDataURL(fileList[0]);
    } else {
      const readers = fileList.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(images => {
        setSelectedImages(images);
        setSelectedImage(images[0]);
        setOriginalImage(images[0]);
        const history: Record<string, string> = {};
        images.forEach(img => { history[img] = img; });
        setImageHistory((prev) => ({ ...prev, ...history }));
        setEditorState('editing');
        setActiveTab('edit');
        handleAnalyze(images[0]);
      });
    }
  };

  const handleBatchEnhance = async () => {
    if (!selectedImages.length) return;
    
    let finalPrompt = undefined;

    if (selectedImages.length <= 1) {
      handleEnhance(activeEnhancement, finalPrompt, refImage || undefined);
      return;
    }
    
    setIsProcessing(true);
    setBatchProgress(0);
    try {
      const results = await batchEnhance(
        selectedImages, 
        activeEnhancement, 
        (count) => setBatchProgress(Math.round((count / selectedImages.length) * 100)),
        finalPrompt,
        refImage || undefined
      );
      
      const enhancedImages = results.map(r => r.processedImage).filter(Boolean) as string[];
      
      // Update history for comparison
      const newHistory: Record<string, string> = { ...imageHistory };
      results.forEach((res, idx) => {
        if (res.processedImage) {
          newHistory[res.processedImage] = selectedImages[idx];
        }
      });
      setImageHistory(newHistory);
      
      setSelectedImages(enhancedImages);
      setSelectedImage(enhancedImages[0]);
      setOriginalImage(newHistory[enhancedImages[0]] || enhancedImages[0]);
      
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.5 }
      });
    } catch (err) {
      showToast("Batch processing failed.", 'error');
    } finally {
      setIsProcessing(false);
      setBatchProgress(0);
    }
  };

  const handleEnhance = async (typeOverride?: EnhancementType, promptOverride?: string, refImageOverride?: string) => {
    if (!selectedImage) return;
    
    const type = typeOverride || activeEnhancement;

    setIsProcessing(true);
    try {
      let finalPrompt = promptOverride;
      const refImg = refImageOverride || refImage;
      
      console.log(`Enhancing with type: ${type}, prompt: ${finalPrompt}`);
      const res = await enhanceImage(selectedImage, type, finalPrompt, refImg || undefined);
      if (res.processedImage) {
        // Track history for comparison slider
        setImageHistory(prev => ({
           ...prev,
           [res.processedImage!]: selectedImage
        }));
        
        setSelectedImage(res.processedImage);
        setDescription(res.description);
        // Show success
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        throw new Error("AI returned an empty result. Please try again with a different photo.");
      }
    } catch (err: any) {
      console.error("Full Enhancement Error:", err);
      const errorMessage = err.message || "AI Processing failed. Check your API key or connection.";
      showToast(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Sub-Components ---
  const ComparisonView = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMove = (clientX: number) => {
      if (!containerRef.current || comparisonMode !== 'split') return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(position);
    };

    const onMouseDown = (e: React.MouseEvent) => {
      if (comparisonMode === 'split') {
        setIsDragging(true);
        handleMove(e.clientX);
      } else if (comparisonMode === 'touch') {
        setIsPressing(true);
      }
    };

    const onTouchStart = (e: React.TouchEvent) => {
      if (comparisonMode === 'split') {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      } else if (comparisonMode === 'touch') {
        setIsPressing(true);
      }
    };

    const stopDragging = () => {
      setIsDragging(false);
      if (comparisonMode === 'touch') setIsPressing(false);
    };

    useEffect(() => {
      if (isDragging || isPressing) {
        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', stopDragging);
        
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', stopDragging);
          window.removeEventListener('touchmove', handleTouchMove);
          window.removeEventListener('touchend', stopDragging);
        };
      }
    }, [isDragging, isPressing]);

    if (comparisonMode === 'side') {
      return (
        <div className="w-full flex flex-col gap-2">
          <div className="w-full grid grid-cols-2 gap-2 aspect-[4/3] md:aspect-[16/6]">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/5">
              <img src={originalImage!} alt="Original" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 glass-morphism px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest">Original</div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-brand-accent/20">
              <img src={selectedImage!} alt="Enhanced" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 glass-morphism bg-brand-accent/20 border-brand-accent/30 text-brand-accent px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest">Enhanced</div>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/40 italic">Side-by-side view for detailed inspection</p>
        </div>
      );
    }

    if (comparisonMode === 'touch') {
      return (
        <div 
          className="w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative cursor-pointer active:scale-[0.98] transition-transform duration-300"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <img 
            src={isPressing ? originalImage! : selectedImage!} 
            alt="Comparison" 
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
            referrerPolicy="no-referrer"
          />
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <div className={cn(
              "glass-morphism px-3 py-1.5 rounded-xl border border-white/10 transition-opacity",
              isPressing ? "opacity-100" : "opacity-0"
            )}>
              <span className="text-[10px] font-bold uppercase tracking-widest">Original</span>
            </div>
            <div className={cn(
              "glass-morphism bg-brand-accent/20 px-3 py-1.5 rounded-xl border border-brand-accent/30 transition-opacity text-brand-accent",
              !isPressing ? "opacity-100" : "opacity-0"
            )}>
              <span className="text-[10px] font-bold uppercase tracking-widest">Enhanced</span>
            </div>
          </div>

          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em]">
              {isPressing ? 'Release to Enhance' : 'Press & Hold to Compare'}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={containerRef}
        className="compare-container w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative cursor-ew-resize group"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Enhanced (Underneath) */}
        <img 
          src={selectedImage!} 
          alt="Enhanced" 
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />

        {/* Original (On Top, Clipped) */}
        <div 
          className="absolute inset-0 w-full h-full object-cover overflow-hidden z-10"
          style={{ width: `${sliderPos}%` }}
        >
          <img 
            src={originalImage!} 
            alt="Original" 
            className="w-[calc(100vw-2rem)] md:w-[calc(100vw-30rem)] max-w-none h-full object-cover"
            style={{ width: containerRef.current?.offsetWidth }}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Vertical Divider & Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white/50 backdrop-blur-sm z-20 transition-colors group-hover:bg-brand-accent/80" 
          style={{ left: `calc(${sliderPos}% - 2px)` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl shadow-black/50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-black/20 rounded-full" />
              <div className="w-0.5 h-3 bg-black/20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Floating Labels */}
        <div 
          className="absolute bottom-6 left-6 z-20 pointer-events-none transition-opacity duration-300"
          style={{ opacity: sliderPos > 20 ? 1 : 0 }}
        >
          <div className="glass-morphism px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/50" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Original</span>
          </div>
        </div>

        <div 
          className="absolute bottom-6 right-6 z-20 pointer-events-none transition-opacity duration-300"
          style={{ opacity: sliderPos < 80 ? 1 : 0 }}
        >
          <div className="glass-morphism bg-brand-accent/20 px-3 py-1.5 rounded-xl border border-brand-accent/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">AI Photo Pro</span>
          </div>
        </div>

        {/* Hint */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
        >
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] animate-bounce">
            Slide to Compare
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden relative">
      {/* --- Top Navbar --- */}
      <nav className="h-16 px-6 flex items-center justify-between border-b border-white/5 z-50 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-display font-bold tracking-tighter italic">AI PHOTO PRO</h1>
        </div>
        <div className="flex gap-4">
          {editorState === 'editing' ? (
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-white text-black rounded-full font-bold text-xs flex items-center gap-1 transition-transform active:scale-95"
            >
              <Download className="w-3 h-3" />
              SAVE
            </button>
          ) : (
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-white/70" />
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              {/* Hero Section */}
              <section className="relative px-6 pt-8 pb-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/10 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] -z-10" />
                
                <h2 className="text-3xl font-display font-bold leading-tight tracking-tighter mb-2">
                  Elevate your <br />
                  <span className="text-brand-accent italic">Visual Story</span>
                </h2>
                <p className="text-white/40 text-sm max-w-[240px] leading-relaxed">
                  Professional AI tools to refine, restore, and reimagining your photography.
                </p>
              </section>

              {/* Action Cards */}
              <section className="px-6 flex flex-col gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[16/6] rounded-[24px] bg-gradient-to-br from-brand-accent to-[#C0FF00] p-[1px] relative overflow-hidden group shadow-xl shadow-brand-accent/20 active:scale-[0.98] transition-transform"
                >
                  <div className="w-full h-full rounded-[23px] bg-black/90 flex items-center px-6 gap-6 justify-between overflow-hidden relative">
                    <div className="flex flex-col items-start gap-1 z-10">
                       <span className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.2em]">New Project</span>
                       <h3 className="text-2xl font-display font-bold">Import Image</h3>
                       <p className="text-white/40 text-[10px] italic">RAW, JPG, or PNG</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-brand-accent text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform z-10">
                      <Plus className="w-8 h-8" strokeWidth={3} />
                    </div>
                    
                    {/* Decorative Background */}
                    <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-brand-accent/20 blur-2xl rounded-full" />
                  </div>
                </button>
              </section>

              {/* Recent Edits */}
              {savedEdits.length > 0 && (
                <section className="px-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">Recent Masterpieces</h3>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="text-[10px] font-bold text-brand-accent uppercase"
                    >
                      View All
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {savedEdits.map((edit) => (
                      <button
                        key={edit.id}
                        onClick={() => handleOpenSaved(edit)}
                        className="shrink-0 w-28 aspect-[3/4] rounded-2xl overflow-hidden relative group active:scale-95 transition-transform"
                      >
                        <img src={edit.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[8px] font-bold text-white/60 truncate">
                            {new Date(edit.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Tools Categories */}
              <section className="px-6 flex flex-col gap-4 pb-12">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">Creative Suite</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'ai_enhance', label: 'AI Enhance', icon: <Sparkles className="w-5 h-5" />, color: 'bg-orange-500/20 text-orange-400' },
                    { id: 'beautify', label: 'Portrait Pro', icon: <User className="w-5 h-5" />, color: 'bg-blue-500/20 text-blue-400' },
                    { id: 'studio_sets', label: 'Studio Sets', icon: <Camera className="w-5 h-5" />, color: 'bg-indigo-500/20 text-indigo-400' },
                    { id: 'relight', label: 'Relight', icon: <Layers className="w-5 h-5" />, color: 'bg-purple-500/20 text-purple-400' },
                    { id: 'restore', label: 'Restore', icon: <Scissors className="w-5 h-5" />, color: 'bg-emerald-500/20 text-emerald-400' },
                    { id: 'vibrant', label: 'Vibrant', icon: <Palette className="w-5 h-5" />, color: 'bg-brand-accent/20 text-brand-accent' },
                  ].map(tool => (
                    <button 
                      key={tool.id}
                      onClick={() => {
                        if (tool.id === 'studio_sets') {
                          setActiveEnhancement('studio_pro');
                          setActiveStudioSet('ethereal');
                        } else {
                          setActiveEnhancement(tool.id as EnhancementType);
                          setActiveStudioSet(null);
                        }
                        setActiveTab('edit');
                        if (!selectedImage) {
                          setEditorState('idle');
                          fileInputRef.current?.click();
                        } else {
                          setEditorState('editing');
                        }
                      }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all hover:border-white/20 text-left active:scale-95"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tool.color)}>
                        {tool.icon}
                      </div>
                      <span className="text-xs font-bold">{tool.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'create' && (
            <motion.div 
              key="create"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="p-6 h-full flex flex-col pt-10"
            >
              <div className="flex flex-col gap-6 flex-1">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-display font-bold italic tracking-tighter">AI Imagine</h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Describe your masterpiece</p>
                </div>

                <div className="relative group">
                  <textarea 
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    placeholder="A futuristic city with purple neon lights and flying cars..."
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-[32px] p-6 text-sm focus:outline-none focus:border-brand-accent/50 transition-all resize-none placeholder:text-white/20"
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] text-white/20 font-mono">
                    {generationPrompt.length}/500
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Cyberpunk samurai",
                    "Cosmic jellyfish",
                    "Minimalist architecture",
                    "Abstract oil painting"
                  ].map(suggestion => (
                    <button 
                      key={suggestion}
                      onClick={() => setGenerationPrompt(suggestion)}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold hover:bg-white/10 transition-all text-white/50 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isProcessing || !generationPrompt.trim()}
                  className="w-full py-5 rounded-[24px] bg-brand-accent text-black font-bold shadow-xl shadow-brand-accent/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  GENERATE IMAGE
                </button>

                {generatedImage ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-4"
                  >
                    <div className="aspect-square rounded-[32px] overflow-hidden border border-white/10 shadow-2xl relative group">
                      <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={() => {
                            if (generatedImage) {
                              handleDownloadWithAd(generatedImage, `aiphotopro_gen_${Date.now()}.png`);
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        >
                          <Download className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={handleUseGenerated}
                          className="px-6 py-3 rounded-full bg-brand-accent text-black font-bold text-xs shadow-lg active:scale-95 transition-transform"
                        >
                          EDIT IMAGE
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 py-10">
                    <ImageIcon className="w-20 h-20 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest leading-loose">
                      Your imagination <br />
                      starts here
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'edit' && (
            <motion.div 
              key="edit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="p-6 h-full flex flex-col pt-10"
            >
              {editorState === 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[4/5] rounded-[40px] border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-4 bg-white/5 group hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-brand-accent transition-colors">
                      <Plus className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold">New Creation</h3>
                      <p className="text-white/40 text-sm">Upload to start editing</p>
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setEditorState('idle')}
                      className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleReset}
                      className="text-[10px] font-bold text-white/40 hover:text-brand-accent transition-colors uppercase tracking-widest"
                    >
                      Reset
                    </button>
                    <div className="text-center">
                      <h2 className="text-sm font-bold uppercase tracking-widest">Adjust</h2>
                      <p className="text-[10px] text-brand-accent font-medium uppercase tracking-tighter">Manual & Smart Fix</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={handleShare}
                        className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleSave}
                        className="w-10 h-10 rounded-full bg-brand-accent text-black flex items-center justify-center shadow-lg shadow-brand-accent/20 active:scale-95 transition-transform"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center -mb-4 z-10">
                    <div className="bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex gap-1">
                      {[
                        { id: 'split', icon: <Split className="w-3.5 h-3.5" />, label: 'Split' },
                        { id: 'side', icon: <Columns2 className="w-3.5 h-3.5" />, label: 'Side' },
                        { id: 'touch', icon: <Eye className="w-3.5 h-3.5" />, label: 'Touch' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setComparisonMode(mode.id as ComparisonMode)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all",
                            comparisonMode === mode.id 
                              ? "bg-brand-accent text-black shadow-lg" 
                              : "text-white/40 hover:text-white"
                          )}
                        >
                          {mode.icon}
                          <span className="text-[9px] font-bold uppercase tracking-wider">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <ComparisonView />

                  {/* Batch Gallery */}
                  {selectedImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                      {selectedImages.map((img, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            setSelectedImage(img);
                            setOriginalImage(imageHistory[img] || img);
                          }}
                          className={cn(
                            "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                            selectedImage === img ? "border-brand-accent scale-105" : "border-transparent opacity-50"
                          )}
                        >
                          <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Mode Selector */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between ml-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">AI Enhancements</span>
                      <Sparkles className="w-3 h-3 text-brand-accent animate-pulse" />
                    </div>

                    <div className="flex flex-col gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleEnhance('ai_enhance')}
                        disabled={isProcessing}
                        className="w-full p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4 group transition-all"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                           <Sparkles className="w-6 h-6 text-brand-accent" fill="currentColor" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-xs text-white uppercase tracking-tight">AI Enhance</h4>
                          <p className="text-[10px] text-white/40 leading-tight">Ultra HD + Denoise + Vibrant automatically.</p>
                        </div>
                        <div className="ml-auto bg-brand-accent/10 text-brand-accent px-2 py-1 rounded-lg text-[8px] font-black tracking-tighter">NEW</div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleEnhance('ai_photo_video')}
                        disabled={isProcessing}
                        className="w-full p-4 rounded-3xl bg-gradient-to-r from-brand-accent/20 to-orange-500/10 border border-brand-accent/30 flex items-center gap-4 group transition-all relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="w-12 h-12 rounded-2xl bg-brand-accent flex items-center justify-center shrink-0 shadow-lg shadow-brand-accent/40">
                           <Video className="w-6 h-6 text-black" fill="black" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-white uppercase tracking-tight">AI Photo → Video</h4>
                            <div className="bg-brand-accent px-1.5 py-0.5 rounded text-[8px] font-black text-black">HOT</div>
                          </div>
                          <p className="text-[10px] text-white/40 leading-tight">Optimizes photo for cinematic AI video generation.</p>
                        </div>
                        <Sparkles className="w-4 h-4 ml-auto text-brand-accent/40" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleEnhance('studio_pro')}
                        disabled={isProcessing}
                        className="w-full p-4 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center gap-4 group transition-all"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/40">
                           <Camera className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-xs text-white uppercase tracking-tight">One-Click Studio Pro</h4>
                          <p className="text-[10px] text-white/40 leading-tight">Instant high-end lighting and aesthetic retouching.</p>
                        </div>
                        <div className="ml-auto bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg text-[8px] font-black tracking-tighter">STUDIO</div>
                      </motion.button>
                    </div>

                    {/* Categories of Filters */}
                    <div className="flex flex-col gap-6">
                      {/* Artistic Masters */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between ml-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Artistic Masters</span>
                          <Palette className="w-3 h-3 text-brand-accent/40" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['van_gogh', 'sketch', 'anime'].map(id => {
                            const opt = ENHANCEMENT_OPTIONS.find(o => o.id === id);
                            if (!opt) return null;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  setActiveEnhancement(opt.id);
                                  setActiveStudioSet(null);
                                }}
                                className={cn(
                                  "p-3 rounded-2xl flex flex-col items-center text-center gap-1 transition-all border",
                                  activeEnhancement === opt.id && !activeStudioSet
                                    ? "bg-brand-accent/20 border-brand-accent/50" 
                                    : "bg-white/5 border-white/10 opacity-60"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center relative",
                                  activeEnhancement === opt.id && !activeStudioSet ? "bg-brand-accent text-black shadow-lg" : "bg-white/10"
                                )}>
                                  {opt.icon}
                                </div>
                                <span className="text-[10px] font-bold leading-tight mt-1">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Modern Aesthetics */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between ml-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Modern Aesthetics</span>
                          <Maximize2 className="w-3 h-3 text-brand-accent/40" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['cyberpunk', 'vintage_film', 'monochrome'].map(id => {
                            const opt = ENHANCEMENT_OPTIONS.find(o => o.id === id);
                            if (!opt) return null;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  setActiveEnhancement(opt.id);
                                  setActiveStudioSet(null);
                                }}
                                className={cn(
                                  "p-3 rounded-2xl flex flex-col items-center text-center gap-1 transition-all border",
                                  activeEnhancement === opt.id && !activeStudioSet
                                    ? "bg-brand-accent/20 border-brand-accent/50" 
                                    : "bg-white/5 border-white/10 opacity-60"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center relative",
                                  activeEnhancement === opt.id && !activeStudioSet ? "bg-brand-accent text-black shadow-lg" : "bg-white/10"
                                )}>
                                  {opt.icon}
                                </div>
                                <span className="text-[10px] font-bold leading-tight mt-1">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Studio Environment Section */}
                      <div className="flex flex-col gap-4 py-2">
                        <div className="flex items-center justify-between ml-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent">Studio Environments</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                          </div>
                          <Camera className="w-3.5 h-3.5 text-brand-accent/40" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pb-2">
                          {STUDIO_SETS.map(set => (
                            <button
                              key={set.id}
                              onClick={() => {
                                setActiveStudioSet(set.id);
                                setActiveEnhancement('studio_pro');
                              }}
                              className={cn(
                                "group relative aspect-[4/3] rounded-3xl overflow-hidden transition-all duration-500",
                                activeStudioSet === set.id 
                                  ? "ring-2 ring-brand-accent ring-offset-4 ring-offset-black scale-[0.98]" 
                                  : "opacity-40 hover:opacity-80 scale-100"
                              )}
                            >
                              <img 
                                src={set.preview} 
                                alt={set.label} 
                                className={cn(
                                  "w-full h-full object-cover transition-transform duration-700",
                                  activeStudioSet === set.id ? "scale-110" : "scale-100 group-hover:scale-105"
                                )} 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-left">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white leading-tight">
                                  {set.label}
                                </span>
                              </div>
                              
                              {activeStudioSet === set.id && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center shadow-lg">
                                  <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        
                        {/* Selected Set Details Overlay Style */}
                        <AnimatePresence>
                          {activeStudioSet && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="mx-1 p-4 rounded-[28px] bg-white/5 border border-white/10 shadow-inner group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0">
                                  {STUDIO_SETS.find(s => s.id === activeStudioSet)?.icon}
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.1em]">
                                      {STUDIO_SETS.find(s => s.id === activeStudioSet)?.label} Configured
                                    </p>
                                    <Sparkles className="w-3 h-3 text-brand-accent/40" />
                                  </div>
                                  <p className="text-[10px] text-white/50 leading-relaxed italic">
                                    "AI will seamlessly place your subject into this environment using neural style projection."
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </div>

                  {/* Move Apply Button Here (A bit higher) */}
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => {
                        if (selectedImages.length > 1) {
                          handleBatchEnhance();
                        } else {
                          const customPrompt = activeStudioSet ? STUDIO_SETS.find(s => s.id === activeStudioSet)?.prompt : undefined;
                          handleEnhance(activeEnhancement, customPrompt);
                        }
                      }}
                      disabled={isProcessing}
                      className={cn(
                        "w-full h-14 rounded-2xl flex items-center justify-center gap-3 transition-all font-bold text-sm shadow-xl",
                        isProcessing ? "bg-white/10 cursor-not-allowed" : "bg-gradient-to-r from-brand-accent to-orange-400 text-black hover:shadow-brand-accent/20 active:scale-[0.98]"
                      )}
                    >
                      {isProcessing 
                        ? (batchProgress > 0 ? `Processing: ${batchProgress}%` : "AI Magic in Progress...") 
                        : selectedImages.length > 1 
                          ? `Apply Viral Effects to ${selectedImages.length} Photos` 
                          : `APPLY ${ENHANCEMENT_OPTIONS.find(o => o.id === activeEnhancement)?.label?.toUpperCase() || 'AI MAGIC'}`}
                      {!isProcessing && <Sparkles className="w-4 h-4 animate-pulse" />}
                    </button>
                  </div>

                  {/* AI Status / Description */}
                  {description && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-2xl bg-brand-accent/10 border border-brand-accent/20"
                    >
                      <p className="text-[11px] text-white/80 leading-relaxed italic">
                        "{description}"
                      </p>
                    </motion.div>
                  )}

                  {/* AI Smart Captions */}
                  {(suggestions.captions.length > 0 || isAnalyzing) && (
                    <div className="flex flex-col gap-3 pb-10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Social Captions</span>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {suggestions.captions.map((caption, idx) => (
                          <div key={idx} className="shrink-0 p-4 rounded-2xl bg-white/5 border border-white/10 w-48 flex flex-col gap-2 group hover:border-brand-accent transition-all">
                            <p className="text-[10px] text-white/80 italic leading-tight">"{caption}"</p>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(caption);
                                confetti({ particleCount: 20, spread: 30, origin: { y: 1 } });
                              }}
                              className="mt-auto text-[9px] font-bold text-brand-accent uppercase flex items-center gap-1"
                            >
                              <Check className="w-2 h-2" />
                              Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pb-10 flex flex-col gap-4">
                    {/* Captions and analysis move lower */}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
             <motion.div 
             key="profile"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="p-8 flex flex-col gap-8"
           >
             <div className="flex flex-col items-center gap-4 py-4">
               <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-brand-accent p-1">
                  <img src={user?.photoURL || "https://i.pravatar.cc/150?u=me"} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                </div>
               </div>
               <div className="text-center">
                 <h2 className="text-2xl font-display font-bold">{user?.displayName || "Creator Pro"}</h2>
                 <p className="text-white/40 text-sm">{user?.email}</p>
               </div>
             </div>

             <div className="grid grid-cols-3 gap-1 rounded-3xl overflow-hidden min-h-[300px] bg-white/5 p-1">
                {savedEdits.length > 0 ? (
                  savedEdits.map(edit => (
                    <button 
                      key={edit.id} 
                      onClick={() => handleOpenSaved(edit)}
                      className="aspect-square bg-white/5 relative group overflow-hidden active:scale-95 transition-opacity"
                    >
                       <img src={edit.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                       <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-6 h-6 text-brand-accent" />
                       </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center opacity-20">
                    <ImageIcon className="w-12 h-12 mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No saved edits yet</p>
                  </div>
                )}
             </div>
             <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><User className="w-5 h-5 text-purple-400" /></div>
                    <span className="font-bold text-sm">Account Settings</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 rotate-180 opacity-30" />
                </div>
                
                <button 
                  onClick={() => logOut()}
                  className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-rose-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center"><X className="w-5 h-5" /></div>
                    <span className="font-bold text-sm">Sign Out</span>
                  </div>
                </button>
             </div>
           </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Login Overlay --- */}
      <AnimatePresence>
        {!user && !isAuthLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-accent/20 rounded-full blur-[120px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-sm flex flex-col items-center gap-8 relative z-10">
              <div className="text-center space-y-4">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-brand-accent to-orange-400 mx-auto flex items-center justify-center shadow-2xl shadow-brand-accent/40"
                >
                  <Sparkles className="w-12 h-12 text-black" strokeWidth={2.5} />
                </motion.div>
                <div className="space-y-1">
                  <h1 className="text-4xl font-display font-bold tracking-tighter italic">AI PHOTO PRO</h1>
                  <p className="text-white/40 text-xs uppercase tracking-[0.4em] font-black">AI Photo Editor</p>
                </div>
              </div>

              <div className="space-y-6 w-full mt-8">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-center">Welcome Back</h2>
                  <p className="text-white/40 text-xs text-center leading-relaxed px-4">
                    Sign in to sync your photo history and unlock premium AI features.
                  </p>
                </div>

                <button 
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                    } catch (error: any) {
                      if (error.code !== 'auth/popup-closed-by-user') {
                        showToast("Sign in failed. Please try again.", 'error');
                      }
                    }
                  }}
                  className="w-full h-14 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  CONTINUE WITH GOOGLE
                </button>
              </div>

              <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mt-4">
                By continuing, you agree to our Terms of Service
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Loading State --- */}
      <AnimatePresence>
        {isAuthLoading && (
          <div className="fixed inset-0 z-[400] bg-black flex items-center justify-center">
             <div className="w-12 h-12 rounded-full border-2 border-brand-accent/20 border-t-brand-accent animate-spin" />
          </div>
        )}
      </AnimatePresence>

      {/* --- Bottom Navigation --- */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-6 pointer-events-none z-50">
        <nav className="max-w-[400px] mx-auto h-16 pointer-events-auto bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full px-2 flex items-center justify-around shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
          <IconButton 
            icon={<Home className="w-5 h-5" />} 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            label="Home"
          />
          <IconButton 
            icon={<Sparkles className="w-5 h-5" />} 
            active={activeTab === 'create'} 
            onClick={() => setActiveTab('create')} 
            label="AI Create"
          />
          <IconButton 
            icon={<Palette className="w-5 h-5" />} 
            active={activeTab === 'edit'} 
            onClick={() => setActiveTab('edit')} 
            label="Editor"
          />
          <IconButton 
            icon={<User className="w-5 h-5" />} 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            label="Profile"
          />
        </nav>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        multiple 
        accept="image/*" 
        className="hidden" 
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed bottom-24 left-6 right-6 z-50 p-4 rounded-2xl flex items-center gap-3 shadow-2xl border backdrop-blur-xl",
              toastType === 'success' 
                ? "bg-green-500/20 border-green-500/30 text-green-200" 
                : "bg-rose-500/20 border-rose-500/30 text-rose-200"
            )}
          >
            {toastType === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="text-xs font-bold uppercase tracking-widest">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Rewarded Ad Overlay --- */}
      <AnimatePresence>
        {isAdShowing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="absolute top-8 left-8 flex items-center gap-2">
              <div className="bg-brand-accent px-2 py-0.5 rounded text-[10px] font-black text-black">AD</div>
              <span className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase">Private Preview</span>
            </div>

            {adCountdown > 0 && (
              <button 
                className="absolute top-8 right-8 w-12 h-12 rounded-full glass-morphism flex flex-col items-center justify-center overflow-hidden"
                disabled
              >
                <span className="text-xs font-black text-brand-accent">{adCountdown}</span>
                <div className="absolute bottom-0 left-0 h-1 bg-brand-accent transition-all duration-1000" style={{ width: `${(adCountdown/10)*100}%` }} />
              </button>
            )}

            <div className="max-w-xs space-y-8 flex flex-col items-center">
              {adCountdown > 0 ? (
                <>
                  <div className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center relative shadow-2xl">
                    <PlayCircle className="w-12 h-12 text-brand-accent animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-black">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-display font-bold italic tracking-tighter">AI Photo Pro+</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Upgrade to unlock 4K downloads, unlimited generations, and remove all ads.
                    </p>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 10, ease: "linear" }}
                      className="h-full bg-brand-accent"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Downloading soon...</p>
                </>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-8 flex flex-col items-center"
                >
                  <div className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center relative">
                    <Trophy className="w-16 h-16 text-green-400" />
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white"
                    >
                      <Check className="w-6 h-6" strokeWidth={4} />
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-display font-bold text-green-400 italic">Reward Earned!</h3>
                    <p className="text-sm text-white/60">
                      Thank you for watching. Your high-quality download is ready.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (pendingDownload) {
                        triggerDownload(pendingDownload.url, pendingDownload.name);
                      }
                      setIsAdShowing(false);
                      setPendingDownload(null);
                    }}
                    className="w-full py-5 rounded-[24px] bg-white text-black font-bold text-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
                  >
                    <Download className="w-5 h-5" />
                    DOWNLOAD NOW
                  </button>
                </motion.div>
              )}
            </div>

            <div className="absolute bottom-12 left-12 right-12 flex items-center gap-4 text-left">
              <ShieldAlert className="w-8 h-8 text-white/20 shrink-0" />
              <p className="text-[9px] text-white/20 leading-tight">
                This is a simulated advertisement for demonstration purposes. In a live environment, this would integrate with AdMob, Unity Ads, or Google Ad Manager.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Processing Overlay --- */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-2 border-brand-accent/20 border-t-brand-accent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-brand-accent animate-pulse" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-display font-bold tracking-tighter italic">AI PHOTO PRO</h2>
              <div className="h-6 overflow-hidden flex items-center justify-center mt-2">
                <motion.p 
                  key={Math.floor(Date.now() / 2000)}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.3em]"
                >
                  {batchProgress > 0 
                    ? `Processing Batch: ${batchProgress}%` 
                    : [
                        "Analyzing Pixels...",
                        "Refining Details...",
                        "Removing Grain...",
                        "Calibrating Colors...",
                        "Enhancing Clarity...",
                        "Finalizing Masterpiece..."
                      ][Math.floor(Date.now() / 2000) % 6]
                  }
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconButton({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center h-12 px-2 min-w-[72px] rounded-2xl transition-all duration-300 relative group",
        active ? "text-brand-accent" : "text-white/30 hover:text-white/60"
      )}
    >
      {active && (
        <motion.div 
          layoutId="tab-pill"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          className="absolute inset-x-1 inset-y-1 bg-brand-accent/[0.08] border border-brand-accent/20 rounded-xl -z-10"
        />
      )}
      <div className="flex flex-col items-center justify-center">
        <div className={cn("transition-transform duration-300", active && "scale-110 -translate-y-0.5")}>
          {icon}
        </div>
        <AnimatePresence>
          {active && (
            <motion.span 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[8px] font-black uppercase tracking-[0.05em] mt-1"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}

import { useState, useRef, useEffect } from "react";
import { useConversations, useCreateConversation, useConversation, useChatStream, useDeleteConversation } from "@/hooks/use-chat";
import { BottomNav } from "@/components/BottomNav";
import { Send, Plus, MessageSquare, Bot, Image as ImageIcon, X, Trash2, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Helper for file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function ChatPage() {
  const { data: conversations, isLoading: isLoadingConvos } = useConversations();
  const { mutate: createConvo } = useCreateConversation();
  const { mutate: deleteConvo } = useDeleteConversation();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-select first conversation or create one if none exist
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations]);

  const handleNewChat = () => {
    createConvo("New Consultation", {
      onSuccess: (data) => {
        setActiveId(data.id);
        setShowHistory(false);
      },
    });
  };

  const handleDeleteChat = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteConvo(id, {
      onSuccess: () => {
        if (activeId === id) {
          setActiveId(null);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 overflow-hidden h-screen sm:h-auto">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm z-20 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold font-display text-slate-900">Expert Nutrition AI</h1>
        </div>
        <Button 
          onClick={handleNewChat}
          size="icon"
          variant="ghost"
          className="bg-emerald-50 text-primary hover:bg-emerald-100 rounded-full"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* History Sidebar - Animated Overlay for Mobile */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="absolute inset-0 bg-black/20 z-30"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 left-0 w-4/5 max-w-xs bg-white z-40 shadow-xl flex flex-col"
              >
                <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
                  <span className="font-semibold text-slate-700">Historique des chats</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations?.map((convo) => (
                    <div
                      key={convo.id}
                      onClick={() => {
                        setActiveId(convo.id);
                        setShowHistory(false);
                      }}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        activeId === convo.id 
                          ? "bg-emerald-50 text-emerald-700" 
                          : "hover:bg-gray-100 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeId === convo.id ? "text-emerald-500" : "text-slate-400"}`} />
                        <span className="truncate text-sm font-medium">{convo.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteChat(e, convo.id)}
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(!conversations || conversations.length === 0) && (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                      Aucun historique
                    </div>
                  )}
                </div>
                <div className="p-4 border-t">
                  <Button 
                    onClick={handleNewChat}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle consultation
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden">
          {activeId ? (
            <ChatWindow conversationId={activeId} key={activeId} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <Bot className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Bienvenue sur votre assistant IA</h3>
              <p className="max-w-xs mx-auto">Commencez une nouvelle conversation pour obtenir des conseils nutritionnels personnalisés.</p>
              <Button onClick={handleNewChat} className="mt-6 px-8 rounded-full">
                Commencer
              </Button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function ChatWindow({ conversationId }: { conversationId: number }) {
  const { data: conversation } = useConversation(conversationId);
  const { sendMessage, streamingContent, isStreaming } = useChatStream(conversationId);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const messages = conversation?.messages || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setSelectedImage(base64);
      } catch (err) {
        console.error("Failed to read file", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isStreaming) return;
    
    try {
      await sendMessage(input, selectedImage); 
      setInput("");
      setSelectedImage(null);
    } catch (err: any) {
      if (err.message?.includes("Limit reached") || err.status === 403) {
        toast({
          variant: "destructive",
          title: "Limite atteinte",
          description: "Vous avez atteint votre limite de 5 messages gratuits par jour. Passez à la version Premium !",
        });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              msg.role === "user" 
                ? "bg-primary text-white rounded-br-none" 
                : "bg-white text-slate-800 shadow-sm rounded-bl-none border border-gray-100"
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        {isStreaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="max-w-[85%] p-4 rounded-2xl bg-white text-slate-800 shadow-sm rounded-bl-none border border-gray-100">
               <p className="leading-relaxed whitespace-pre-wrap text-sm">
                 {streamingContent}
                 <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
               </p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative inline-block mb-4"
            >
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="h-20 w-20 object-cover rounded-xl border-2 border-primary/20"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 p-1 bg-white border border-gray-200 rounded-full shadow-sm text-gray-500 hover:text-red-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageSelect}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-3 bg-gray-50 text-slate-600 rounded-xl hover:bg-gray-100 transition"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez vos questions..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-w-0"
          />
          <button 
            type="submit" 
            disabled={(!input.trim() && !selectedImage) || isStreaming}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none hover:bg-emerald-600 transition-all active:scale-95 z-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

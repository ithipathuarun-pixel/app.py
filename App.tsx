
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ShoppingBag, LayoutDashboard, History, Bell, Search, Plus, Minus, X, 
  CheckCircle2, Clock, Play, PackageCheck, Edit, Trash2, Camera, 
  UtensilsCrossed, CreditCard, QrCode, ArrowRight, MessageSquareText, 
  User, Lock, LogOut, ChevronRight, Sparkles, Coffee, PartyPopper, Check,
  AlertCircle, RotateCcw, XCircle, Send, Bot
} from 'lucide-react';
import { MenuItem, CartItem, Order, OrderStatus, Category } from './types';
import { MENU_ITEMS as INITIAL_MENU_ITEMS } from './constants';
import { GoogleGenAI } from "@google/genai";

type View = 'customer' | 'merchant' | 'queue-status' | 'order-complete' | 'order-rejected';
type MerchantSubView = 'orders' | 'menu';
type Role = 'guest' | 'customer' | 'merchant';

const App: React.FC = () => {
  // Session & Role Management
  const [role, setRole] = useState<Role>(() => {
    const savedRole = localStorage.getItem('phayao_role');
    return (savedRole as Role) || 'guest';
  });
  const [view, setView] = useState<View>('customer');
  const [merchantSubView, setMerchantSubView] = useState<MerchantSubView>('orders');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Menu & Order State
  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('phayao_menu');
    return saved ? JSON.parse(saved) : INITIAL_MENU_ITEMS;
  });
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [nextQueueNo, setNextQueueNo] = useState(1);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  
  const [notifications, setNotifications] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

  // AI Assistant State (The "Streamline" part)
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiHistory, setAiHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // UI Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('phayao_menu', JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem('phayao_role', role);
  }, [role]);

  // Scroll AI chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [aiHistory]);

  // STATUS MONITORING & AUTO-CLEANUP
  useEffect(() => {
    if (lastOrderId && role === 'customer') {
      const myOrder = orders.find(o => o.id === lastOrderId);
      if (myOrder) {
        if (myOrder.status === OrderStatus.COMPLETED) {
          setView('order-complete');
          setCart([]);
          setLastOrderId(null);
          localStorage.removeItem('phayao_cart');
        } else if (myOrder.status === OrderStatus.CANCELLED) {
          setView('order-rejected');
          setCart([]);
          setLastOrderId(null);
        }
      }
    }
  }, [orders, lastOrderId, role]);

  const notify = useCallback((message: string) => {
    setNotifications(prev => [...prev, message]);
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== message));
    }, 5000);
  }, []);

  // AI Assistant Logic
  const handleAiAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiInput.trim() || isAiThinking) return;

    const userMsg = aiInput;
    setAiInput('');
    setAiHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `คุณคือผู้ช่วย AI ประจำร้าน "บ้านหอมชาพะเยา" ร้านอาหารและเครื่องดื่มชั้นนำในพะเยา
      เมนูของร้านเรามี: ${menu.map(i => `${i.name} ราคา ${i.price} บาท (${i.description})`).join(', ')}
      จงตอบคำถามลูกค้าอย่างสุภาพและน่าประทับใจ`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: context }] },
          ...aiHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
      });

      const aiText = response.text || "ขออภัยครับ ระบบขัดข้องชั่วคราว";
      setAiHistory(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      setAiHistory(prev => [...prev, { role: 'model', text: "ขออภัยครับ ผมไม่สามารถเชื่อมต่อได้ในขณะนี้" }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Auth Handlers
  const handleMerchantLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '907264') {
      setRole('merchant');
      setView('merchant');
      setLoginError('');
      setPasswordInput('');
    } else {
      setLoginError('รหัสผ่านไม่ถูกต้อง (กรุณาลองใหม่อีกครั้ง)');
    }
  };

  const handleCustomerEnter = () => {
    setRole('customer');
    setView('customer');
  };

  const logout = () => {
    setRole('guest');
    setView('customer');
    setCart([]);
    setLastOrderId(null);
    localStorage.removeItem('phayao_role');
  };

  // Order Flow
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (itemId: string) => setCart(prev => prev.filter(i => i.id !== itemId));
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };
  const updateItemNotes = (itemId: string, notes: string) => {
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, notes } : i));
  };

  const finalizeOrder = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        queueNumber: `A${nextQueueNo.toString().padStart(3, '0')}`,
        items: [...cart],
        totalPrice: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
        status: OrderStatus.PENDING,
        createdAt: Date.now(),
        customerName: customerName || 'ลูกค้าทั่วไป'
      };
      setOrders(prev => [...prev, newOrder]);
      setLastOrderId(newOrder.id);
      setNextQueueNo(prev => prev + 1);
      setShowPaymentModal(false);
      setIsProcessingPayment(false);
      setView('queue-status');
      notify(`ออร์เดอร์ของ ${newOrder.customerName} (คิว ${newOrder.queueNumber}) ได้รับแล้ว`);
    }, 1500);
  };

  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    const order = orders.find(o => o.id === orderId);
    if (order) {
      if (nextStatus === OrderStatus.READY) notify(`คิว ${order.queueNumber} พร้อมเสิร์ฟแล้ว!`);
      if (nextStatus === OrderStatus.COMPLETED) notify(`ออร์เดอร์ ${order.queueNumber} จัดส่งเรียบร้อยแล้ว`);
      if (nextStatus === OrderStatus.CANCELLED) notify(`ออร์เดอร์ ${order.queueNumber} ถูกปฏิเสธ (ยกเลิกแล้ว)`);
    }
  };

  const clearAllOrders = () => {
    if (confirm('ยืนยันการล้างรายการออร์เดอร์ทั้งหมด (Reset)?')) {
      setOrders([]);
      setNextQueueNo(1);
      notify('ล้างรายการออร์เดอร์ทั้งหมดแล้ว');
    }
  };

  if (role === 'guest') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-200">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white/90 backdrop-blur-xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/50">
          <div className="bg-emerald-800 p-12 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <Sparkles className="w-64 h-64 -mt-20 -ml-20 animate-pulse text-emerald-100" />
            </div>
            <div className="bg-white/20 p-5 rounded-[2rem] backdrop-blur-md mb-8 border border-white/30">
              <Coffee size={64} className="text-white" />
            </div>
            <h1 className="text-4xl font-black mb-4 leading-tight tracking-tighter">บ้านหอมชาพะเยา</h1>
            <p className="text-emerald-100 font-medium">สุนทรียภาพแห่งรสชา ท่ามกลางบรรยากาศเมืองพะเยา</p>
          </div>
          
          <div className="p-12 flex flex-col justify-center space-y-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-emerald-950 tracking-tighter">เข้าสู่ระบบ</h2>
              <p className="text-emerald-600 font-medium">เลือกรูปแบบเพื่อเริ่มต้นประสบการณ์</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleCustomerEnter}
                className="w-full group bg-emerald-50 hover:bg-emerald-700 p-8 rounded-[2.5rem] border border-emerald-100 flex items-center justify-between transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-emerald-700 text-white p-4 rounded-3xl group-hover:bg-white group-hover:text-emerald-700 transition duration-500 shadow-lg">
                    <ShoppingBag size={28} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-xl text-emerald-900 group-hover:text-white transition duration-500">สั่งอาหาร/จองคิว</p>
                    <p className="text-sm text-emerald-600 group-hover:text-emerald-100 transition duration-500">เลือกเมนูและรับคิวทันที</p>
                  </div>
                </div>
                <ChevronRight className="text-emerald-300 group-hover:text-white group-hover:translate-x-1 transition duration-500" />
              </button>

              <div className="pt-8 border-t border-emerald-50">
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em] mb-6 ml-2">สำหรับพนักงาน / เจ้าของร้าน</p>
                <form onSubmit={handleMerchantLogin} className="space-y-4">
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                    <input 
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="รหัสผ่านผู้จัดการ"
                      className="w-full pl-14 pr-6 py-5 bg-emerald-50 border-2 border-transparent focus:border-emerald-500 rounded-[2rem] outline-none transition-all font-mono font-bold tracking-widest text-emerald-900 shadow-inner"
                    />
                  </div>
                  {loginError && <p className="text-red-500 text-sm font-bold ml-4">{loginError}</p>}
                  <button type="submit" className="w-full bg-emerald-900 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                    <LayoutDashboard size={20} /> เข้าสู่ระบบจัดการร้าน
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Navbar = () => (
    <nav className="bg-emerald-800 text-white shadow-xl sticky top-0 z-50 border-b border-emerald-900/50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('customer')}>
          <div className="bg-white p-2 rounded-2xl group-hover:rotate-12 transition-transform duration-500">
            <Coffee className="text-emerald-800" size={24} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">บ้านหอมชาพะเยา</h1>
        </div>
        <div className="flex items-center gap-2">
          {role === 'customer' && (
            <>
              <button onClick={() => setView('customer')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${view === 'customer' ? 'bg-emerald-950 shadow-inner' : 'hover:bg-emerald-700'}`}>
                <ShoppingBag size={18} /> <span className="hidden sm:inline">เมนู</span>
              </button>
              <button onClick={() => setView('queue-status')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${view === 'queue-status' ? 'bg-emerald-950 shadow-inner' : 'hover:bg-emerald-700'}`}>
                <History size={18} /> <span className="hidden sm:inline">คิวของฉัน</span>
              </button>
            </>
          )}
          {role === 'merchant' && (
            <button onClick={() => setView('merchant')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${view === 'merchant' ? 'bg-emerald-950 shadow-inner' : 'hover:bg-emerald-700'}`}>
              <LayoutDashboard size={18} /> <span className="hidden sm:inline">จัดการร้าน</span>
            </button>
          )}
          <button 
            onClick={() => setIsAiOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-400 text-emerald-950 rounded-2xl font-black text-sm hover:bg-white transition-all shadow-lg active:scale-95"
          >
            <Bot size={18} /> <span className="hidden sm:inline">ถาม AI</span>
          </button>
          <button onClick={logout} className="ml-2 p-2.5 bg-red-500/10 text-red-100 hover:bg-red-500 rounded-2xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen pb-20 bg-emerald-50/40">
      <Navbar />
      
      {/* Notifications */}
      <div className="fixed top-24 right-6 z-[60] flex flex-col gap-3 max-w-sm pointer-events-none">
        {notifications.map((msg, idx) => (
          <div key={idx} className="bg-emerald-900/95 backdrop-blur-md text-white px-7 py-5 rounded-[2rem] shadow-2xl border border-white/20 pointer-events-auto flex items-center gap-4 animate-in slide-in-from-right duration-500">
            <div className="bg-emerald-400 p-2 rounded-xl text-emerald-900"><Bell size={20} className="animate-bounce" /></div>
            <p className="text-sm font-black leading-tight">{msg}</p>
          </div>
        ))}
      </div>

      <main className="max-w-7xl mx-auto p-6 animate-in fade-in duration-700">
        
        {/* Status Views */}
        {view === 'order-complete' && (
          <div className="min-h-[70vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-[4rem] p-12 text-center shadow-2xl border border-emerald-50 animate-in zoom-in duration-700">
              <div className="bg-emerald-100 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg animate-bounce">
                <PartyPopper size={48} className="text-emerald-700" />
              </div>
              <h2 className="text-4xl font-black text-emerald-950 mb-4 tracking-tighter">ส่งมอบเรียบร้อย!</h2>
              <p className="text-gray-500 mb-10 leading-relaxed font-medium">
                ร้านได้ทำการจัดส่งอาหาร/เครื่องดื่มให้คุณแล้ว<br/>
                หวังว่าจะได้รับความประทับใจ
              </p>
              <div className="bg-emerald-50/80 p-6 rounded-[2rem] mb-10 border border-emerald-100">
                 <p className="text-emerald-800 font-black italic text-lg">"ขอบคุณที่มาใช้บริการ บ้านหอมชาพะเยา ครับ"</p>
              </div>
              <button 
                onClick={() => setView('customer')}
                className="w-full bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-emerald-800 transition active:scale-95"
              >
                สั่งเมนูอื่นต่อ
              </button>
            </div>
          </div>
        )}

        {view === 'order-rejected' && (
          <div className="min-h-[70vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-[4rem] p-12 text-center shadow-2xl border border-red-50 animate-in zoom-in duration-700">
              <div className="bg-red-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg text-red-500">
                <XCircle size={48} />
              </div>
              <h2 className="text-4xl font-black text-red-950 mb-4 tracking-tighter">ขออภัยอย่างสูง</h2>
              <p className="text-gray-500 mb-10 leading-relaxed font-medium">
                ทางร้านต้องขออภัยที่ไม่สามารถรับออร์เดอร์ได้ในขณะนี้<br/>
                เนื่องจากวัตถุดิบหมดหรือคิวเต็มกะทันหัน
              </p>
              <div className="bg-red-50 p-6 rounded-[2rem] mb-10 border border-red-100">
                 <p className="text-red-800 font-black italic text-lg">"ทางร้านจะปรับปรุงการบริการให้ดีขึ้นครับ"</p>
              </div>
              <button 
                onClick={() => setView('customer')}
                className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-black transition active:scale-95"
              >
                กลับไปที่เมนู
              </button>
            </div>
          </div>
        )}

        {view === 'customer' && (
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1">
              <div className="flex overflow-x-auto gap-3 mb-8 pb-2 scrollbar-hide">
                {(['all', 'food', 'drink', 'dessert'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-10 py-4 rounded-[1.5rem] whitespace-nowrap font-black text-sm transition-all duration-300 ${
                      activeCategory === cat ? 'bg-emerald-800 text-white shadow-xl scale-105' : 'bg-white text-emerald-900 border border-emerald-100 hover:border-emerald-400'
                    }`}
                  >
                    {cat === 'all' ? 'เมนูทั้งหมด' : cat === 'food' ? 'อาหาร' : cat === 'drink' ? 'เครื่องดื่ม' : 'ของหวาน'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {menu.filter(i => activeCategory === 'all' || i.category === activeCategory).map(item => (
                  <div key={item.id} className="bg-white rounded-[2.5rem] shadow-sm border border-emerald-50 overflow-hidden hover:shadow-2xl transition-all duration-500 group relative">
                    <div className="relative h-64 overflow-hidden">
                      <img src={item.image || 'https://images.unsplash.com/photo-1544787210-282725509cb8?auto=format&fit=crop&q=80&w=600'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" />
                      <div className="absolute top-5 right-5 bg-white/95 backdrop-blur px-5 py-2 rounded-2xl font-black text-emerald-800 shadow-xl text-xl">฿{item.price}</div>
                    </div>
                    <div className="p-7">
                      <h3 className="text-2xl font-black text-emerald-950 mb-2 leading-tight">{item.name}</h3>
                      <p className="text-gray-400 text-sm mb-8 line-clamp-2 min-h-[3rem] font-medium leading-relaxed">{item.description || 'เมนูแนะนำจากบ้านหอมชาพะเยา'}</p>
                      <button onClick={() => addToCart(item)} className="w-full bg-emerald-50 text-emerald-800 hover:bg-emerald-800 hover:text-white py-4 rounded-[1.2rem] flex items-center justify-center gap-3 font-black transition-all shadow-sm">
                        <Plus size={20} strokeWidth={3} /> เพิ่มรายการ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-[450px]">
              <div className="bg-white rounded-[3.5rem] shadow-2xl p-10 sticky top-28 border border-emerald-50 flex flex-col min-h-[500px]">
                <h2 className="text-3xl font-black text-emerald-900 mb-10 flex items-center gap-4">
                  <div className="bg-emerald-100 p-2.5 rounded-2xl"><ShoppingBag className="text-emerald-700" size={28} /></div> ตะกร้าของฉัน
                </h2>
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                    <ShoppingBag size={80} className="mb-6 text-emerald-200" />
                    <p className="font-black text-emerald-900 text-lg">ยังไม่มีรายการสั่งซื้อ</p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-5 max-h-[45vh] overflow-y-auto mb-10 pr-2 scrollbar-hide">
                    {cart.map(item => (
                      <div key={item.id} className="p-6 bg-emerald-50/40 rounded-[2.5rem] border border-emerald-100 group transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-black text-emerald-950 text-lg leading-tight">{item.name}</h4>
                          <button onClick={() => removeFromCart(item.id)} className="text-emerald-300 hover:text-red-500 transition-colors p-1"><X size={20} strokeWidth={3} /></button>
                        </div>
                        <div className="flex justify-between items-center mb-5">
                          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl shadow-sm border border-emerald-50">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-emerald-600 transition"><Minus size={16} /></button>
                            <span className="font-black text-emerald-900 w-6 text-center text-xl">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-emerald-600 transition"><Plus size={16} /></button>
                          </div>
                          <span className="font-black text-emerald-800 text-2xl tracking-tighter">฿{item.price * item.quantity}</span>
                        </div>
                        <div className="relative">
                          <MessageSquareText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                          <input 
                            type="text" 
                            value={item.notes || ''}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                            placeholder="ระบุเพิ่มเติม เช่น หวานน้อย..."
                            className="w-full pl-11 pr-5 py-3 text-sm bg-white rounded-2xl border-2 border-transparent focus:border-emerald-300 outline-none font-bold text-emerald-900 shadow-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {cart.length > 0 && (
                  <div className="pt-8 border-t-2 border-emerald-50 border-dashed">
                    <div className="mb-8">
                      <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-[0.2em] mb-3 ml-2 block">ชื่อเรียกคิว</label>
                      <input 
                        type="text" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="ชื่อของคุณ..."
                        className="w-full px-7 py-5 rounded-[1.5rem] bg-emerald-50 border-2 border-transparent focus:border-emerald-500 outline-none font-black text-emerald-950 shadow-inner text-lg"
                      />
                    </div>
                    <div className="flex justify-between items-end mb-10 px-2">
                      <span className="text-gray-400 font-black uppercase text-sm tracking-widest">ยอดรวม</span>
                      <span className="text-5xl font-black text-emerald-900 tracking-tighter">฿{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
                    </div>
                    <button onClick={() => setShowPaymentModal(true)} className="w-full py-6 bg-emerald-800 text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-emerald-200 hover:bg-emerald-900 active:scale-95 transition-all flex items-center justify-center gap-4">
                      <CreditCard size={28} /> ชำระเงิน/รับคิว
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'queue-status' && (
          <div className="bg-white rounded-[4.5rem] shadow-2xl overflow-hidden border border-emerald-100 max-w-6xl mx-auto">
            <div className="bg-emerald-800 p-16 text-center text-white relative">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <h2 className="text-6xl font-black mb-4 relative tracking-tighter">สถานะคิว</h2>
               <p className="text-emerald-100 font-bold text-xl relative opacity-80 italic">เรากำลังเตรียมเมนูสุดพิเศษให้คุณ</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-t border-emerald-50">
              <div className="p-16 bg-emerald-50/10">
                <div className="flex items-center gap-6 mb-12">
                  <div className="bg-green-600 text-white p-6 rounded-[2.5rem] shadow-xl animate-pulse border-4 border-white"><Check size={40} strokeWidth={4} /></div>
                  <div>
                    <h3 className="text-4xl font-black text-emerald-950 tracking-tighter">พร้อมเสิร์ฟ</h3>
                    <p className="text-green-600 font-black text-xl tracking-tight">เชิญที่จุดรับอาหารได้เลยครับ</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {orders.filter(o => o.status === OrderStatus.READY).map(o => (
                    <div key={o.id} className="bg-white border-[6px] border-green-500 rounded-[3.5rem] p-12 text-center shadow-2xl animate-in zoom-in duration-500 transform hover:scale-105 transition-transform">
                      <span className="text-7xl font-black text-green-700 block mb-3 tracking-tighter">{o.queueNumber}</span>
                      <p className="text-green-600 font-black text-2xl uppercase tracking-tighter truncate">{o.customerName}</p>
                    </div>
                  ))}
                  {orders.filter(o => o.status === OrderStatus.READY).length === 0 && (
                    <div className="col-span-2 text-center py-16 bg-white/50 rounded-[3rem] border-4 border-dashed border-emerald-100 opacity-30">
                      <p className="text-emerald-900 font-black text-xl italic">ยังไม่มีคิวที่พร้อมเสิร์ฟ</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-16">
                <div className="flex items-center gap-6 mb-12">
                  <div className="bg-emerald-100 text-emerald-800 p-6 rounded-[2.5rem]"><Clock size={40} /></div>
                  <div>
                    <h3 className="text-4xl font-black text-emerald-950 tracking-tighter">กำลังเตรียม</h3>
                    <p className="text-emerald-500 font-black text-xl tracking-tight">พิถีพิถันเพื่อรสชาติที่ดีที่สุด</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-5">
                  {orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING).map(o => (
                    <div key={o.id} className="bg-white border-2 border-emerald-50 rounded-[2rem] px-10 py-7 shadow-xl flex flex-col items-center hover:bg-emerald-800 hover:text-white transition-all duration-500 group min-w-[120px]">
                      <span className="text-4xl font-black group-hover:text-white">{o.queueNumber}</span>
                      <span className="text-xs font-black uppercase tracking-[0.2em] mt-2 opacity-40 group-hover:opacity-100">{o.customerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'merchant' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <h2 className="text-5xl font-black text-emerald-950 tracking-tighter flex items-center gap-5"><LayoutDashboard size={48} className="text-emerald-700" /> จัดการร้าน</h2>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex bg-white p-2.5 rounded-[2rem] shadow-2xl border border-emerald-50">
                  <button onClick={() => setMerchantSubView('orders')} className={`px-10 py-4 rounded-[1.5rem] font-black text-sm transition-all duration-500 ${merchantSubView === 'orders' ? 'bg-emerald-800 text-white shadow-xl scale-105' : 'text-emerald-300 hover:text-emerald-800'}`}>ออร์เดอร์วันนี้</button>
                  <button onClick={() => setMerchantSubView('menu')} className={`px-10 py-4 rounded-[1.5rem] font-black text-sm transition-all duration-500 ${merchantSubView === 'menu' ? 'bg-emerald-800 text-white shadow-xl scale-105' : 'text-emerald-300 hover:text-emerald-800'}`}>เมนูอาหาร</button>
                </div>
                {merchantSubView === 'orders' && (
                  <button 
                    onClick={clearAllOrders}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-8 py-4 rounded-[1.5rem] font-black text-sm hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95"
                  >
                    <RotateCcw size={18} /> ล้างคิวทั้งหมด
                  </button>
                )}
              </div>
            </div>

            {merchantSubView === 'orders' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                  {orders.filter(o => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.COMPLETED).length === 0 ? (
                    <div className="bg-white p-32 rounded-[4rem] text-center border-4 border-dashed border-emerald-100 shadow-inner">
                       <PackageCheck size={100} className="mx-auto mb-6 text-emerald-50" />
                       <p className="text-emerald-200 font-black text-2xl">ไม่มีออร์เดอร์ค้างส่ง</p>
                    </div>
                  ) : (
                    orders.filter(o => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.COMPLETED).sort((a,b) => b.createdAt - a.createdAt).map(order => (
                      <div key={order.id} className="bg-white rounded-[4rem] p-12 border border-emerald-100 shadow-2xl flex flex-col md:flex-row gap-12 hover:shadow-emerald-100 transition duration-700">
                        <div className="flex-1">
                          <div className="flex items-center gap-8 mb-10">
                            <span className="bg-emerald-100 text-emerald-900 font-black text-4xl px-8 py-5 rounded-[2rem] shadow-inner">{order.queueNumber}</span>
                            <div>
                              <h4 className="text-3xl font-black text-emerald-950">{order.customerName}</h4>
                              <p className="text-base font-bold text-emerald-300 tracking-[0.2em]">{new Date(order.createdAt).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <div className="space-y-5 mb-10">
                            {order.items.map(it => (
                              <div key={it.id} className="text-lg bg-emerald-50/20 p-6 rounded-[2rem] border border-emerald-100/30">
                                <div className="flex justify-between font-black text-emerald-900">
                                  <span><span className="text-emerald-500 mr-3 font-mono">x{it.quantity}</span> {it.name}</span>
                                  <span className="text-emerald-700 tracking-tighter">฿{it.price * it.quantity}</span>
                                </div>
                                {it.notes && <p className="text-sm text-emerald-600 mt-4 flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-emerald-100 w-fit font-black"><MessageSquareText size={16}/> {it.notes}</p>}
                              </div>
                            ))}
                          </div>
                          <div className="border-t-4 border-dashed border-emerald-50 pt-8 flex justify-between items-center">
                             <div className="flex items-center gap-3 bg-green-50 text-green-800 px-6 py-3 rounded-2xl text-base font-black border border-green-100 shadow-sm">
                               <Check size={20} strokeWidth={4} /> ชำระเงินเรียบร้อย
                             </div>
                             <span className="font-black text-5xl text-emerald-950 tracking-tighter">฿{order.totalPrice}</span>
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-5 min-w-[240px]">
                           {order.status === OrderStatus.PENDING && (
                             <>
                               <button onClick={() => updateOrderStatus(order.id, OrderStatus.PREPARING)} className="flex-1 bg-emerald-800 text-white rounded-[2rem] font-black text-xl py-7 hover:bg-emerald-950 shadow-2xl transition transform active:scale-95">รับออร์เดอร์</button>
                               <button onClick={() => updateOrderStatus(order.id, OrderStatus.CANCELLED)} className="flex-1 bg-red-50 text-red-600 border border-red-100 rounded-[2rem] font-black text-xl py-7 hover:bg-red-600 hover:text-white shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2">
                                 <XCircle size={24} /> ปฏิเสธการสั่ง
                               </button>
                             </>
                           )}
                           {order.status === OrderStatus.PREPARING && <button onClick={() => updateOrderStatus(order.id, OrderStatus.READY)} className="flex-1 bg-green-500 text-white rounded-[2rem] font-black text-xl py-7 hover:bg-green-600 shadow-2xl transition transform active:scale-95">แจ้งพร้อมเสิร์ฟ</button>}
                           {order.status === OrderStatus.READY && <button onClick={() => updateOrderStatus(order.id, OrderStatus.COMPLETED)} className="flex-1 bg-gray-900 text-white rounded-[2rem] font-black text-xl py-7 hover:bg-black shadow-2xl transition transform active:scale-95">ส่งมอบเรียบร้อย</button>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-10">
                  <div className="bg-emerald-950 text-white rounded-[4rem] p-12 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-45 transition-transform duration-1000"><Sparkles size={140} /></div>
                    <h4 className="text-emerald-400 font-black text-sm uppercase tracking-[0.3em] mb-12 border-b border-emerald-900 pb-4">สรุปยอดขาย</h4>
                    <div className="space-y-12">
                       <div>
                         <p className="text-6xl font-black mb-2 tracking-tighter">฿{orders.filter(o => o.status === OrderStatus.COMPLETED).reduce((a,o) => a + o.totalPrice, 0)}</p>
                         <p className="text-emerald-400 text-xs font-black uppercase tracking-widest opacity-60">รายได้สุทธิวันนี้</p>
                       </div>
                       <div>
                         <p className="text-6xl font-black mb-2 tracking-tighter">{orders.length}</p>
                         <p className="text-emerald-400 text-xs font-black uppercase tracking-widest opacity-60">จำนวนออร์เดอร์รวม</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex justify-between items-center bg-white p-12 rounded-[4rem] border border-emerald-50 shadow-2xl">
                   <div>
                      <h3 className="text-4xl font-black text-emerald-950 tracking-tighter">รายการเมนูอาหาร</h3>
                      <p className="text-emerald-400 font-black text-lg mt-2 tracking-tight">({menu.length} รายการที่เปิดขาย)</p>
                   </div>
                   <button onClick={() => { setEditingItem({ name: '', price: 0, category: 'food', description: '', image: '' }); setIsEditingMenu(true); }} className="bg-emerald-800 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-950 hover:-translate-y-2 transition-all flex items-center gap-4 active:scale-95">
                     <Plus size={32} /> เพิ่มเมนูใหม่
                   </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
                   {menu.map(item => (
                     <div key={item.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-emerald-50 shadow-2xl relative group hover:shadow-emerald-200 transition duration-700">
                        <div className="h-64 w-full overflow-hidden relative">
                           <img src={item.image || 'https://images.unsplash.com/photo-1544787210-282725509cb8?auto=format&fit=crop&q=80&w=600'} className="h-full w-full object-cover group-hover:scale-110 transition duration-1000" />
                           <div className="absolute inset-0 bg-emerald-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center gap-5 backdrop-blur-sm">
                              <button onClick={() => { setEditingItem(item); setIsEditingMenu(true); }} className="bg-white p-5 rounded-[1.5rem] text-blue-600 shadow-2xl hover:scale-110 transition active:scale-90"><Edit size={28}/></button>
                              <button onClick={() => { if(confirm('ยืนยันการลบเมนูนี้ออกจากร้าน?')) setMenu(m => m.filter(i => i.id !== item.id)); }} className="bg-white p-5 rounded-[1.5rem] text-red-600 shadow-2xl hover:scale-110 transition active:scale-90"><Trash2 size={28}/></button>
                           </div>
                        </div>
                        <div className="p-8">
                           <div className="flex justify-between items-start mb-3">
                              <h4 className="font-black text-emerald-950 text-xl leading-tight truncate pr-4">{item.name}</h4>
                              <span className="text-emerald-700 font-black text-2xl tracking-tighter">฿{item.price}</span>
                           </div>
                           <p className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em]">{item.category}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* AI Assistant Modal (The "Streamline" capability) */}
      {isAiOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsAiOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl h-[80vh] rounded-[4rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-700 flex flex-col">
            <div className="bg-emerald-800 p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-400 p-3 rounded-2xl text-emerald-950"><Bot size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">ผู้ช่วย AI อัจฉริยะ</h3>
                  <p className="text-emerald-200 text-sm font-bold">สอบถามข้อมูลเมนูและบริการได้ทันที</p>
                </div>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition"><X size={24} /></button>
            </div>
            
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-hide bg-emerald-50/20">
              {aiHistory.length === 0 && (
                <div className="text-center py-20 opacity-30">
                  <Bot size={80} className="mx-auto mb-6 text-emerald-200" />
                  <p className="text-lg font-black text-emerald-900">สวัสดีครับ มีอะไรให้ช่วยไหมครับ?</p>
                </div>
              )}
              {aiHistory.map((h, i) => (
                <div key={i} className={`flex ${h.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-7 py-5 rounded-[2.5rem] shadow-sm text-base font-bold leading-relaxed ${
                    h.role === 'user' ? 'bg-emerald-800 text-white rounded-tr-lg' : 'bg-white text-emerald-950 rounded-tl-lg border border-emerald-100'
                  }`}>
                    {h.text}
                  </div>
                </div>
              ))}
              {isAiThinking && (
                <div className="flex justify-start">
                  <div className="bg-white px-7 py-5 rounded-[2.5rem] rounded-tl-lg border border-emerald-100 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleAiAsk} className="p-8 bg-white border-t border-emerald-50 flex gap-4">
              <input 
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="พิมพ์คำถามของคุณที่นี่..."
                className="flex-1 px-8 py-5 rounded-3xl bg-emerald-50 border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-emerald-900"
              />
              <button type="submit" disabled={isAiThinking} className="bg-emerald-800 text-white p-5 rounded-3xl hover:bg-emerald-950 shadow-xl transition active:scale-90">
                <Send size={24} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => !isProcessingPayment && setShowPaymentModal(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-700">
             <div className="bg-emerald-800 p-16 text-center text-white relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h3 className="text-4xl font-black mb-3 relative tracking-tighter">ชำระเงินเพื่อรับคิว</h3>
                <p className="text-emerald-100 font-black relative text-lg opacity-80">สแกน QR Code PromptPay เพื่อยืนยัน</p>
             </div>
             <div className="p-16 text-center">
                <div className="flex justify-center mb-12">
                   <img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png" className="h-14 object-contain" />
                </div>
                <div className="bg-emerald-50 p-12 rounded-[4rem] border-4 border-dashed border-emerald-200 mb-12 flex flex-col items-center shadow-inner">
                   <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=PROMPTPAY_PAYMENT_${cart.reduce((a,i)=>a+(i.price*i.quantity),0)}`}
                    className="w-64 h-64 bg-white p-5 rounded-[2.5rem] mb-10 shadow-2xl border-4 border-emerald-50"
                   />
                   <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.3em] mb-2">ยอดรวมสุทธิ</p>
                   <p className="text-7xl font-black text-emerald-950 tracking-tighter">฿{cart.reduce((a,i)=>a+(i.price*i.quantity),0)}</p>
                </div>
                <button 
                  disabled={isProcessingPayment} 
                  onClick={finalizeOrder} 
                  className={`w-full py-7 rounded-[2.5rem] font-black text-3xl shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-4 ${isProcessingPayment ? 'bg-gray-400 cursor-wait' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-100'}`}
                >
                  {isProcessingPayment ? (
                    <>
                       <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                       <span className="ml-2 font-black">กำลังดำเนินการ...</span>
                    </>
                  ) : 'แจ้งโอนเงินแล้ว กดรับคิว'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Menu Edit Modal */}
      {isEditingMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl" onClick={() => setIsEditingMenu(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[5rem] p-16 shadow-2xl animate-in zoom-in duration-500 overflow-hidden">
             <div className="flex justify-between items-center mb-12">
                <div>
                   <h4 className="text-5xl font-black text-emerald-950 tracking-tighter">{editingItem?.id ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h4>
                </div>
                <button onClick={() => setIsEditingMenu(false)} className="bg-emerald-50 p-5 rounded-[2rem] text-emerald-300 hover:text-red-500 transition-all shadow-sm"><X size={32} /></button>
             </div>
             <form onSubmit={(e) => {
               e.preventDefault();
               if(editingItem?.id) setMenu(m => m.map(i => i.id === editingItem.id ? (editingItem as MenuItem) : i));
               else setMenu(m => [...m, { ...editingItem as MenuItem, id: 'm'+Date.now() }]);
               setIsEditingMenu(false);
             }} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-10">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">ชื่อรายการ</label>
                      <input required value={editingItem?.name} onChange={e => setEditingItem(p => p ? {...p, name: e.target.value} : null)} placeholder="ชื่ออาหาร/เครื่องดื่ม" className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-black text-emerald-950 text-xl shadow-inner" />
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">ราคา (฿)</label>
                         <input required type="number" value={editingItem?.price} onChange={e => setEditingItem(p => p ? {...p, price: Number(e.target.value)} : null)} className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-black text-emerald-950 text-xl shadow-inner" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">ประเภท</label>
                         <select value={editingItem?.category} onChange={e => setEditingItem(p => p ? {...p, category: e.target.value as Category} : null)} className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-black text-emerald-950 text-xl shadow-inner appearance-none">
                           <option value="food">อาหาร</option><option value="drink">เครื่องดื่ม</option><option value="dessert">ของหวาน</option>
                         </select>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">คำอธิบาย</label>
                      <textarea rows={5} value={editingItem?.description} onChange={e => setEditingItem(p => p ? {...p, description: e.target.value} : null)} placeholder="รายละเอียดเมนู..." className="w-full px-8 py-5 rounded-[2.5rem] bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-emerald-950 text-base resize-none shadow-inner" />
                   </div>
                </div>
                <div className="space-y-10 flex flex-col justify-between">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">รูปภาพเมนู</label>
                      <div className="border-[6px] border-dashed border-emerald-50 rounded-[4rem] aspect-square flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative group shadow-inner">
                         {editingItem?.image ? <img src={editingItem.image} className="w-full h-full object-cover" /> : <Camera size={80} className="text-emerald-100 opacity-30" />}
                         <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-emerald-950/70 flex items-center justify-center transition-all duration-500 backdrop-blur-md">
                            <span className="bg-white text-emerald-950 px-10 py-5 rounded-[2rem] font-black shadow-2xl flex items-center gap-3">
                               <Camera size={24} /> อัปโหลดรูปภาพ
                            </span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                               const f = e.target.files?.[0];
                               if(f) {
                                  const r = new FileReader();
                                  r.onload = () => setEditingItem(p => p ? {...p, image: r.result as string} : null);
                                  r.readAsDataURL(f);
                               }
                            }} />
                         </label>
                      </div>
                   </div>
                   <button type="submit" className="w-full py-7 bg-emerald-800 text-white rounded-[2.5rem] font-black text-2xl hover:bg-emerald-950 transition-all shadow-2xl">บันทึกรายการ</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

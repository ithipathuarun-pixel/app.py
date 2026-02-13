
import streamlit as st
import google.generativeai as genai
import os
import time
from datetime import datetime

# --- CONFIGURATION ---
st.set_page_config(page_title="บ้านหอมชาพะเยา - Smart Queue", layout="wide", page_icon="🍵")

# Custom CSS for Emerald Theme
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Anuphan:wght@100;400;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Anuphan', sans-serif;
        background-color: #f0fdf4;
    }
    
    .stApp {
        background-color: #f0fdf4;
    }

    .main-title {
        color: #064e3b;
        font-weight: 900;
        font-size: 2.5rem;
        letter-spacing: -1.5px;
        margin-bottom: 10px;
    }

    .card {
        background: white;
        padding: 20px;
        border-radius: 25px;
        box-shadow: 0 10px 20px rgba(6, 78, 59, 0.04);
        border: 1px solid #ecfdf5;
        margin-bottom: 15px;
    }

    .price-tag {
        background-color: #065f46;
        color: white;
        padding: 4px 12px;
        border-radius: 10px;
        font-weight: bold;
    }

    .queue-number {
        font-size: 3.5rem;
        font-weight: 900;
        color: #059669;
        text-align: center;
        line-height: 1;
    }
    </style>
""", unsafe_allow_html=True)

# --- SESSION STATE INITIALIZATION ---
if 'menu' not in st.session_state:
    st.session_state.menu = [
        {"id": "d1", "name": "ชาไทยเย็น สูตรพะเยา", "price": 45, "cat": "drink", "desc": "หอมเข้มข้น หวานมันกำลังดี"},
        {"id": "f2", "name": "ก๋วยเตี๋ยวเรือเนื้อวากิว", "price": 120, "cat": "food", "desc": "น้ำตกเข้มข้น เนื้อวากิวพรีเมียม"},
        {"id": "f3", "name": "น้ำพริกหนุ่ม ผักลวก", "price": 65, "cat": "food", "desc": "สูตรเมืองพะเยาแท้"},
        {"id": "d2", "name": "อัญชันมะนาวน้ำผึ้ง", "price": 40, "cat": "drink", "desc": "น้ำผึ้งแท้เดือนห้า"}
    ]

if 'orders' not in st.session_state:
    st.session_state.orders = []

if 'cart' not in st.session_state:
    st.session_state.cart = []

if 'next_q' not in st.session_state:
    st.session_state.next_q = 1

if 'ai_history' not in st.session_state:
    st.session_state.ai_history = []

# --- GEMINI AI INTEGRATION ---
def get_ai_response(prompt):
    api_key = os.environ.get("API_KEY")
    if not api_key:
        return "ขออภัยครับ ไม่พบ API KEY ในระบบ"
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-3-flash-preview')
        context = f"คุณคือพนักงานร้าน บ้านหอมชาพะเยา รายการเมนู: {st.session_state.menu}. ตอบคำถามลูกค้าอย่างสุภาพ"
        response = model.generate_content(f"{context}\nลูกค้าถามว่า: {prompt}")
        return response.text
    except Exception as e:
        return f"ขออภัยครับ ระบบ AI ขัดข้อง: {str(e)}"

# --- SIDEBAR NAVIGATION ---
with st.sidebar:
    st.markdown("<h2 style='color:#064e3b;'>🍵 บ้านหอมชา</h2>", unsafe_allow_html=True)
    mode = st.radio("เมนูใช้งาน", ["🛒 สั่งอาหาร", "📋 เช็คคิว", "🤖 ถาม AI", "⚙️ หลังร้าน"])
    
    if mode == "⚙️ หลังร้าน":
        pwd = st.text_input("รหัสผ่าน", type="password")
        if pwd != "907264":
            st.warning("ใส่รหัส 907264 เพื่อเข้าใช้งาน")
            mode = "🛒 สั่งอาหาร"

    st.divider()
    if st.button("🔄 รีเซ็ตข้อมูล"):
        st.session_state.orders = []
        st.session_state.next_q = 1
        st.session_state.cart = []
        st.rerun()

# --- MAIN LOGIC ---
if mode == "🛒 สั่งอาหาร":
    st.markdown("<h1 class='main-title'>บ้านหอมชาพะเยา</h1>", unsafe_allow_html=True)
    c_m, c_c = st.columns([2, 1])
    with c_m:
        st.subheader("📋 เมนูแนะนำ")
        cols = st.columns(2)
        for i, it in enumerate(st.session_state.menu):
            with cols[i%2]:
                st.markdown(f"<div class='card'><h4>{it['name']}</h4><p style='color:gray; font-size:0.8rem;'>{it['desc']}</p><span class='price-tag'>฿{it['price']}</span></div>", unsafe_allow_html=True)
                if st.button(f"เลือก {it['name']}", key=f"b_{it['id']}"):
                    st.session_state.cart.append(it)
                    st.toast(f"เพิ่ม {it['name']} แล้ว")
    with c_c:
        st.subheader("🧺 ตะกร้า")
        total = sum(i['price'] for i in st.session_state.cart)
        for idx, i in enumerate(st.session_state.cart):
            st.write(f"{i['name']} - {i['price']}.-")
        st.markdown(f"### รวม: ฿{total}")
        name = st.text_input("ชื่อลูกค้า")
        if st.button("ยืนยันสั่งซื้อ"):
            if name and st.session_state.cart:
                q = f"A{str(st.session_state.next_q).zfill(3)}"
                st.session_state.orders.append({
                    "id": time.time(),
                    "q": q,
                    "name": name,
                    "items": st.session_state.cart.copy(),
                    "total": total,
                    "status": "PENDING",
                    "time": datetime.now().strftime("%H:%M")
                })
                st.session_state.next_q += 1
                st.session_state.cart = []
                st.success(f"คิวของคุณคือ {q}")
                time.sleep(1)
                st.rerun()

elif mode == "📋 เช็คคิว":
    st.markdown("<h1 class='main-title'>สถานะคิว</h1>", unsafe_allow_html=True)
    r = [o for o in st.session_state.orders if o['status'] == "READY"]
    p = [o for o in st.session_state.orders if o['status'] in ["PENDING", "PREPARING"]]
    c1, c2 = st.columns(2)
    with c1:
        st.success("✅ พร้อมรับ")
        for o in r: st.markdown(f"<div class='card'><div class='queue-number'>{o['q']}</div><p style='text-align:center;'>คุณ {o['name']}</p></div>", unsafe_allow_html=True)
    with c2:
        st.info("⏳ กำลังเตรียม")
        for o in p: st.markdown(f"<div class='card' style='text-align:center;'><h3>{o['q']}</h3><small>คุณ {o['name']}</small></div>", unsafe_allow_html=True)

elif mode == "🤖 ถาม AI":
    st.markdown("<h1 class='main-title'>ผู้ช่วย AI</h1>", unsafe_allow_html=True)
    if q := st.chat_input("ถามเกี่ยวกับร้าน..."):
        st.session_state.ai_history.append({"r":"user","c":q})
        st.session_state.ai_history.append({"r":"ai","c":get_ai_response(q)})
    for m in st.session_state.ai_history:
        with st.chat_message("user" if m["r"]=="user" else "assistant"): st.write(m["c"])

elif mode == "⚙️ หลังร้าน":
    st.markdown("<h1 class='main-title'>จัดการร้าน</h1>", unsafe_allow_html=True)
    active = [o for o in st.session_state.orders if o['status'] not in ["DONE", "CANCEL"]]
    for o in active:
        with st.container():
            st.markdown(f"<div class='card'><b>{o['q']} - {o['name']}</b> (฿{o['total']})</div>", unsafe_allow_html=True)
            cc = st.columns(4)
            if o['status'] == "PENDING" and cc[0].button("รับออร์เดอร์", key=f"ac_{o['q']}"): o['status']="PREPARING"; st.rerun()
            if o['status'] == "PREPARING" and cc[0].button("พร้อมเสิร์ฟ", key=f"rd_{o['q']}"): o['status']="READY"; st.rerun()
            if o['status'] == "READY" and cc[0].button("ส่งแล้ว", key=f"dn_{o['q']}"): o['status']="DONE"; st.rerun()
            if cc[1].button("ยกเลิก/ขออภัย", key=f"cl_{o['q']}"): o['status']="CANCEL"; st.rerun()

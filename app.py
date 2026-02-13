import streamlit as st
import google.generativeai as genai

# --- ตั้งค่าพื้นฐาน ---
st.set_page_config(page_title="บ้านหอมชาพะเยา x Gemini", layout="wide")

# --- CSS แบบปลอดภัย (กัน Error) ---
st.markdown("""
    <style>
    .main { background-color: #f0fdf4; }
    h1 { color: #064e3b; }
    </style>
    """, unsafe_allow_html=True)

# --- ดึง API KEY จาก SECRETS ---
# (อย่าลืมไปใส่ใน Settings > Secrets ของ Streamlit Cloud นะครับ)
API_KEY = st.secrets.get("API_KEY", "")

# --- หน้าตาแอป ---
st.title("🍵 บ้านหอมชาพะเยา x Gemini AI")

tab1, tab2 = st.tabs(["🤖 คุยกับ AI", "📋 ระบบร้าน (Coming Soon)"])

with tab1:
    if not API_KEY:
        st.error("กรุณาตั้งค่า API_KEY ใน Secrets ก่อนใช้งานครับ")
    else:
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        if "messages" not in st.session_state:
            st.session_state.messages = []

        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

        if prompt := st.chat_input("สอบถามเมนูชาได้เลย..."):
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.write(prompt)
            
            with st.chat_message("assistant"):
                response = model.generate_content(prompt)
                st.write(response.text)
                st.session_state.messages.append({"role": "assistant", "content": response.text})

with tab2:
    st.info("ระบบจัดการคิวร้านบ้านหอมชาพะเยา กำลังถูกปรับปรุงให้รองรับ AI ครับ")
        padding: 2rem;
        border-radius: 2rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        margin-bottom: 1rem;
        border: 1px solid #e2e8f0;
    }
    
    .queue-badge {
        background-color: #065f46;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 1rem;
        font-weight: bold;
    }
    
    .title-text {
        color: #064e3b;
        font-weight: 900;
        letter-spacing: -1px;
    }
    </style>
    """, unsafe_allow_html=True)

# --- INITIAL STATE ---
if 'menu' not in st.session_state:
    st.session_state.menu = [
        {"id": "f1", "name": "ชาไทยเย็น สูตรพะเยา", "price": 45, "category": "drink", "desc": "ชาไทยหอมเข้มข้น หวานมันกำลังดี"},
        {"id": "f2", "name": "ก๋วยเตี๋ยวเรือเนื้อวากิว", "price": 120, "category": "food", "desc": "น้ำตกเข้มข้น พร้อมเนื้อวากิวสไลด์บาง"},
        {"id": "f3", "name": "น้ำพริกหนุ่ม ผักลวก", "price": 65, "category": "food", "desc": "น้ำพริกหนุ่มทำสดใหม่ทุกวัน"},
        {"id": "d1", "name": "กาแฟสดคั่วกลาง", "price": 55, "category": "drink", "desc": "กาแฟอาราบิก้า 100% จากดอยในพะเยา"}
    ]

if 'orders' not in st.session_state:
    st.session_state.orders = []

if 'cart' not in st.session_state:
    st.session_state.cart = []

if 'next_queue' not in st.session_state:
    st.session_state.next_queue = 1

if 'role' not in st.session_state:
    st.session_state.role = "guest"

if 'ai_history' not in st.session_state:
    st.session_state.ai_history = []

# --- HELPERS ---
def add_to_cart(item):
    for cart_item in st.session_state.cart:
        if cart_item['id'] == item['id']:
            cart_item['qty'] += 1
            return
    st.session_state.cart.append({**item, 'qty': 1})

def place_order(name):
    if not st.session_state.cart:
        return
    
    q_str = f"A{str(st.session_state.next_queue).zfill(3)}"
    new_order = {
        "id": int(time.time()),
        "queue": q_str,
        "customer": name or "ลูกค้าทั่วไป",
        "items": st.session_state.cart.copy(),
        "total": sum(i['price'] * i['qty'] for i in st.session_state.cart),
        "status": "PENDING",
        "time": datetime.now().strftime("%H:%M")
    }
    st.session_state.orders.append(new_order)
    st.session_state.next_queue += 1
    st.session_state.cart = []
    return q_str

# --- AI ASSISTANT ---
def ask_gemini(prompt):
    try:
        genai.configure(api_key=st.secrets.get("API_KEY", "YOUR_API_KEY")) # ใช้ secrets หรือ env
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        context = f"คุณคือผู้ช่วย AI ร้าน 'บ้านหอมชาพะเยา' เมนูคือ: {str(st.session_state.menu)}"
        full_prompt = f"{context}\nคำถามลูกค้า: {prompt}"
        
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        return f"ขออภัยครับ เกิดข้อผิดพลาด: {str(e)}"

# --- NAVIGATION ---
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/3165/3165642.png", width=100)
    st.markdown("<h2 class='title-text'>บ้านหอมชาพะเยา</h2>", unsafe_allow_html=True)
    
    if st.session_state.role == "guest":
        if st.button("🛒 เข้าสู่ระบบลูกค้า"):
            st.session_state.role = "customer"
            st.rerun()
        
        st.divider()
        st.subheader("สำหรับผู้จัดการ")
        pwd = st.text_input("รหัสผ่าน", type="password")
        if st.button("🔑 เข้าหลังร้าน"):
            if pwd == "907264":
                st.session_state.role = "merchant"
                st.rerun()
            else:
                st.error("รหัสผ่านไม่ถูกต้อง")
    else:
        st.info(f"สถานะ: {st.session_state.role.upper()}")
        if st.button("🚪 ออกจากระบบ"):
            st.session_state.role = "guest"
            st.rerun()

# --- MAIN LOGIC ---
if st.session_state.role == "customer":
    tab1, tab2, tab3 = st.tabs(["🍵 สั่งอาหาร", "📋 สถานะคิว", "🤖 ถาม AI"])
    
    with tab1:
        st.markdown("<h1 class='title-text'>เลือกเมนูที่ถูกใจ</h1>", unsafe_allow_html=True)
        cols = st.columns(2)
        for idx, item in enumerate(st.session_state.menu):
            with cols[idx % 2]:
                with st.container(border=True):
                    st.markdown(f"### {item['name']}")
                    st.markdown(f"**ราคา: {item['price']} บาท**")
                    st.caption(item['desc'])
                    if st.button(f"เพิ่มลงตะกร้า", key=f"add_{item['id']}"):
                        add_to_cart(item)
                        st.toast(f"เพิ่ม {item['name']} แล้ว")
        
        st.divider()
        st.subheader("🛒 ตะกร้าสินค้า")
        if not st.session_state.cart:
            st.write("ตะกร้าว่างเปล่า")
        else:
            total = 0
            for i, item in enumerate(st.session_state.cart):
                c1, c2, c3 = st.columns([3, 1, 1])
                c1.write(f"{item['name']}")
                c2.write(f"x{item['qty']}")
                c3.write(f"{item['price'] * item['qty']}.-")
                total += item['price'] * item['qty']
            
            st.markdown(f"### ยอดรวม: {total} บาท")
            name = st.text_input("ชื่อของคุณเพื่อเรียกคิว")
            if st.button("✅ ยืนยันการสั่งซื้อ"):
                q = place_order(name)
                st.success(f"สั่งซื้อสำเร็จ! คิวของคุณคือ {q}")
                time.sleep(2)
                st.rerun()

    with tab2:
        st.markdown("<h1 class='title-text'>ติดตามสถานะคิว</h1>", unsafe_allow_html=True)
        ready = [o for o in st.session_state.orders if o['status'] == "READY"]
        preparing = [o for o in st.session_state.orders if o['status'] in ["PENDING", "PREPARING"]]
        
        c1, c2 = st.columns(2)
        with c1:
            st.success("✅ พร้อมรับอาหาร")
            for o in ready:
                st.markdown(f"<div style='font-size: 3rem; font-weight: 900; text-align: center; color: green;'>{o['queue']}</div>", unsafe_allow_html=True)
        with c2:
            st.info("⏳ กำลังจัดเตรียม")
            for o in preparing:
                st.markdown(f"<div style='font-size: 2rem; font-weight: bold; text-align: center; opacity: 0.5;'>{o['queue']}</div>", unsafe_allow_html=True)

    with tab3:
        st.markdown("<h1 class='title-text'>คุยกับผู้ช่วย AI</h1>", unsafe_allow_html=True)
        user_q = st.chat_input("สอบถามเมนูหรือบริการ...")
        if user_q:
            st.session_state.ai_history.append({"role": "user", "content": user_q})
            with st.spinner("AI กำลังคิด..."):
                ans = ask_gemini(user_q)
                st.session_state.ai_history.append({"role": "assistant", "content": ans})
        
        for chat in st.session_state.ai_history:
            with st.chat_message(chat['role']):
                st.write(chat['content'])

elif st.session_state.role == "merchant":
    m_tab1, m_tab2 = st.tabs(["📦 จัดการออร์เดอร์", "🍴 จัดการเมนู"])
    
    with m_tab1:
        st.markdown("<h1 class='title-text'>แผงควบคุมร้าน</h1>", unsafe_allow_html=True)
        
        if st.button("⚠️ ล้างรายการทั้งหมด (Reset Day)"):
            st.session_state.orders = []
            st.session_state.next_queue = 1
            st.rerun()

        active_orders = [o for o in st.session_state.orders if o['status'] != "COMPLETED" and o['status'] != "CANCELLED"]
        
        if not active_orders:
            st.write("ยังไม่มีออร์เดอร์ใหม่")
        
        for o in active_orders:
            with st.container(border=True):
                col_a, col_b = st.columns([3, 1])
                with col_a:
                    st.markdown(f"### คิว: {o['queue']} - {o['customer']}")
                    for it in o['items']:
                        st.write(f"- {it['name']} x{it['qty']}")
                with col_b:
                    if o['status'] == "PENDING":
                        if st.button(f"รับออร์เดอร์", key=f"prep_{o['id']}"):
                            o['status'] = "PREPARING"
                            st.rerun()
                        if st.button(f"❌ ปฏิเสธ", key=f"rej_{o['id']}"):
                            o['status'] = "CANCELLED"
                            st.toast("ส่งข้อความขออภัยเรียบร้อย")
                            st.rerun()
                    elif o['status'] == "PREPARING":
                        if st.button(f"แจ้งพร้อมรับ", key=f"ready_{o['id']}"):
                            o['status'] = "READY"
                            st.rerun()
                    elif o['status'] == "READY":
                        if st.button(f"เสร็จสิ้น", key=f"done_{o['id']}"):
                            o['status'] = "COMPLETED"
                            st.rerun()

    with m_tab2:
        st.markdown("<h1 class='title-text'>แก้ไขรายการอาหาร</h1>", unsafe_allow_html=True)
        with st.expander("➕ เพิ่มเมนูใหม่"):
            new_name = st.text_input("ชื่อเมนู")
            new_price = st.number_input("ราคา", min_value=0)
            new_desc = st.text_area("คำอธิบาย")
            if st.button("บันทึกเมนู"):
                st.session_state.menu.append({"id": str(time.time()), "name": new_name, "price": new_price, "category": "food", "desc": new_desc})
                st.success("เพิ่มเมนูเรียบร้อย")
                st.rerun()
        
        for item in st.session_state.menu:
            c1, c2 = st.columns([4, 1])
            c1.write(f"{item['name']} - {item['price']}.-")
            if c2.button("ลบ", key=f"del_{item['id']}"):
                st.session_state.menu = [m for m in st.session_state.menu if m['id'] != item['id']]
                st.rerun()

else:
    st.markdown("<div style='text-align: center; padding: 100px;'>", unsafe_allow_html=True)
    st.markdown("<h1 class='title-text' style='font-size: 4rem;'>บ้านหอมชาพะเยา</h1>", unsafe_allow_html=True)
    st.markdown("<p style='font-size: 1.5rem; opacity: 0.6;'>กรุณาเลือกเข้าใช้งานจากแถบเมนูข้างๆ</p>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

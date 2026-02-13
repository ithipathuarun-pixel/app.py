import streamlit as st
import google.generativeai as genai

# 1. ตั้งค่าหน้าแอป
st.set_page_config(page_title="บ้านหอมชาพะเยา AI", page_icon="🍵")

# 2. ส่วนดึง API Key จากระบบ (Secrets)
API_KEY = st.secrets.get("API_KEY", "")

st.title("🍵 บ้านหอมชาพะเยา AI")
st.markdown("ยินดีต้อนรับ! สอบถามข้อมูลร้านหรือเมนูได้เลยครับ")

# 3. ตรวจสอบการใส่ API Key
if not API_KEY:
    st.warning("⚠️ โปรดใส่ API Key ในหน้า Settings > Secrets ของ Streamlit")
else:
    # ตั้งค่า Gemini
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    # ระบบจำประวัติการสนทนา
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # แสดงข้อความแชท
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # ช่องรับคำถาม
    if prompt := st.chat_input("พิมพ์ข้อความที่นี่..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            try:
                response = model.generate_content(prompt)
                st.markdown(response.text)
                st.session_state.messages.append({"role": "assistant", "content": response.text})
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาด: {str(e)}")

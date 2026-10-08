/** @type {import('tailwindcss').Config} */
module.exports = {
  // class ที่ประกอบขึ้นใน JavaScript ก็ต้องถูกสแกนด้วย ไม่งั้นจะไม่ถูกใส่ลงไฟล์ CSS ที่ build
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        forest: '#21452A',
        'forest-dark': '#183420',
        // ชื่อ gold / cream คงไว้เพื่อไม่ต้องไล่แก้ class ทั้งเว็บ — ค่าจริงคือเขียวเน้นและขาวอุ่น
        gold: '#2F7F55',
        cream: '#FFFCF7',
        // ส้มอิฐใช้กับปุ่มจองเท่านั้น
        brick: '#BF4E2B',
        'brick-dark': '#A34022',
        mint: '#CFE8D0',
        dark: '#252520',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        script: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  // class ที่ประกอบขึ้นใน JavaScript ก็ต้องถูกสแกนด้วย ไม่งั้นจะไม่ถูกใส่ลงไฟล์ CSS ที่ build
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        forest: '#21452A',
        'forest-dark': '#183420',
        gold: '#BA9330',
        cream: '#F9F8F2',
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

# clip-kup

สกิลของ Claude Code สำหรับทำคลิปสั้นที่มีเสียงพากย์ไทย:

- **3D motion graphics**: Three.js + Remotion ใช้ mascot กระโดดบนหน้าจอแอปจริงที่ลอยอยู่ในสตูดิโอ มี bloom render ด้วย CPU ได้
- **AI gen**: ภาพและวิดีโอจาก Phaya ต่อด้วย ffmpeg พร้อมซับและการ์ดท้าย
- แนวนอน 16:9 และแนวตั้ง 9:16 (ซับเล็ก) เพลงลดเสียงลงเองช่วงที่มีคนพูด และตรวจเสียงทุกไฟล์ก่อนส่ง

ขั้นตอนอยู่ใน [SKILL.md](SKILL.md) รายละเอียดอยู่ใน [references/](references/)
สกิลอื่นในชุดเดียวกัน: [plan-kup](https://github.com/Neckkup/plan-kup), [deploy-kup](https://github.com/Neckkup/deploy-kup), [docs-kup](https://github.com/Neckkup/docs-kup)

## ต้องมี

- Node.js 22 ขึ้นไป, ffmpeg
- Phaya MCP สำหรับเสียงพากย์ เพลง ภาพ และวิดีโอ AI (ใช้ credit)
- ไม่ต้องใช้ GPU ถ้าจะให้ render เร็ว ดูสเปกเครื่องใน [references/render-machine.md](references/render-machine.md)

## ติดตั้ง

```
git clone https://github.com/Neckkup/clip-kup.git ~/clip-kup
ln -s ~/clip-kup ~/.claude/skills/clip-kup
```

## เริ่มโปรเจกต์คลิป

```
~/clip-kup/scripts/new-project.sh ~/my-video/clip01
cd ~/my-video/clip01
npm run studio                                   # พรีวิวในเบราว์เซอร์
~/clip-kup/scripts/contact-sheet.sh Example 0.35 30 120 240
~/clip-kup/scripts/render.sh Example              # CLIP_KUP_HOST=render@host เพื่อส่งไป render ที่เครื่อง render
```

## License ฟอนต์

`assets/template/public/Sarabun-*.ttf` เป็นฟอนต์ Sarabun ของ Cadson Demak ใช้สัญญาอนุญาต SIL Open Font License 1.1

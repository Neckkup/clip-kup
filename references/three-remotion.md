# ทาง 3D: Three.js + Remotion

คลิปแนว "ของเล่น 3D บนจอแอปที่ลอยอยู่ในสตูดิโอ" แต่ละจอเป็น canvas ที่วาดหน้าจอแอปจริง มี mascot กระโดดกดปุ่ม
render ด้วย CPU ได้ ไม่ต้องใช้ GPU

## โครงโปรเจกต์ (จาก `assets/template`)

| ไฟล์ | หน้าที่ |
|---|---|
| `src/shared.tsx` | ส่วนกลาง: `Slab` (แผ่นจอ + canvas texture + ร่วงตอนจบ), `makeMotion` (กระโดดจาก hop list), `MascotModel`, `CameraRig` (แนวนอน/แนวตั้ง), `followShot`, `mixShot`, `Studio` (ไฟ พื้น หมอก), `Post` (bloom + tone mapping), `LogoPlane` |
| `src/ui-kit.ts` | วาด UI บน canvas: `rr`, `text`, `wrap` (ตัดคำไทยด้วย Intl.Segmenter), `graphemes` (พิมพ์ทีละตัวโดยสระไม่แตก), `button`, `glow`, `pop`, `pulse`, `drawWordmark` |
| `src/<clip>/timeline.ts` | **ที่เดียวที่เก็บเวลาและตำแหน่ง** ของคลิปนั้น: panels (UI px → world), hops, events, VO (`at`, `len`, `text`) |
| `src/<clip>/<Clip>Scene.tsx` | ฟังก์ชันวาดจอแต่ละจอ (pure function ของ `t`), กล้อง, ประกอบฉาก |
| `src/Root.tsx` | `Clip` wrapper (ฟอนต์ เสียง ducking ซับแนวตั้ง) + ลงทะเบียน Composition แนวนอน 1920×1080 และแนวตั้ง 1080×1920 |

เพิ่มคลิปใหม่ = สร้างโฟลเดอร์ `src/<clip>/` แบบ `example/` แล้วเพิ่ม Composition 2 ตัวใน Root

## กฎที่ต้องทำตาม

- **ทุกอย่างเป็นฟังก์ชันของ `t`** Remotion render เฟรมไม่เรียงลำดับและแยก tab ห้ามเก็บ state ข้ามเฟรม ห้ามใช้ `useFrame` คำนวณการเคลื่อนไหว
- **เวลาอยู่ใน timeline.ts เท่านั้น** ฉากกับเสียงอ่านจากที่เดียวกัน
- **ข้อความบนจอเอามาจากแอปจริง** (เช่นไฟล์ i18n) ไม่แต่งเอง ถ้าเป็นข้อมูลสมมติ (ชื่อคน คะแนน) ให้บอกผู้ใช้ตอนส่งงาน
- **สีแบรนด์** เปลี่ยนที่ `SUN`/`TEAL`/`BG` ใน shared.tsx และ `UI` ใน ui-kit.ts ไม่ใช้ mascot หรือโลโก้ของบริษัทอื่น (เช่น Clawd ของ Anthropic)
- **render ด้วย `--gl=swangle`** เครื่องที่ไม่มี GPU `--gl=angle` จะขึ้น "Error creating WebGL context"

## สิ่งที่เคยพลาด

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| สี mascot ซีดเป็นน้ำตาล | AgX tone mapping ลดความสด → ใช้ `ToneMappingMode.NEUTRAL` ใน `<Post/>` และให้ renderer เป็น `NoToneMapping` |
| bloom ไม่ขึ้น | ของที่จะเรืองต้องสว่างเกิน threshold (0.82): ใช้ `emissiveIntensity` > 1 และ `toneMapped={false}` หรือคูณสี material > 1 (ดู `LogoPlane`) |
| mascot หลุดขอบบนตอนกระโดดสูง | ส่ง `yFollow` ใน `followShot` สูงขึ้น (0.5–0.7) หรือยก `look.y` ช่วงนั้น |
| ช็อตจบตัดตัวละคร | กล้องใกล้เกิน ถอย `pos` ออกและยก `y` แล้วเช็กด้วยภาพนิ่ง 2 เฟรมสุดท้าย |
| แนวตั้งเนื้อหาเล็กเป็นแถบกลางจอ | `CameraRig` แนวตั้งใช้ `pull = 1.08`, `fov = 58` อย่าถอยกล้องมากกว่านี้ |
| ซับแนวตั้งใหญ่เกิน | ผู้ใช้ไม่ชอบ ใช้ 38px กล่องบาง (ค่าใน template) แนวนอนไม่ใส่ซับ เว้นแต่ขอ |
| ข้อความไทยพิมพ์ทีละตัวแล้วสระลอย | ตัดด้วย `graphemes()` ไม่ใช่ `.slice()` ของ string |
| สติกเกอร์แบน (mascot นอน) ไม่ตรงกรอบ | `MascotModel` ชดเชย `z + 0.62 * flat` ให้แล้ว ใช้ prop `lie` |

## จังหวะงาน

1. เขียนบท → gen เสียง → `vo.sh` ทุกไฟล์ → ได้ `len` จริง → ใส่ `at` ใน timeline
2. วาง events/hops รอบประโยคพากย์: ภาพเกิดก่อนหรือพร้อมคำที่พูดถึง
3. `npx tsc -p .` → `contact-sheet.sh` 12–16 เฟรมครอบทุกช่วง → ดูเองก่อน แก้กล้องหรือจังหวะ
4. render เต็ม → `finalize.sh` → ดูตารางความดัง → ส่งไฟล์

ถ้าเสียงยาวกว่าภาพ: ยืดเวลาเรื่องทั้งคลิป (`t = frame / FPS / STRETCH`) ร่วมกับเร่งเสียงเล็กน้อย (`vo.sh ... 1.08`) ไม่เกิน 1.1 ไม่งั้นเสียงจะเพี้ยน

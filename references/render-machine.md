# เครื่อง render

render แบบ CPU ล้วน (`--gl=swangle`) Chrome หนึ่งตัวกิน ~1–1.5 core และ RAM ~1 GB
ตัวเลขวัดจริงบนเครื่อง 8 core (`--concurrency=4`, มี bloom): คลิป 15 วิ ≈ 7.5 นาที, 24 วิ ≈ 13.5 นาที (~33 วินาทีต่อวินาทีของคลิป)
แถวอื่นในตารางเป็นค่าประมาณ

## วัดจริง (คลิป Overview 24 วิ = 720 เฟรม, 1920×1080, มี bloom)

| เครื่อง | วิธี | เวลา render |
|---|---|---|
| dev 8 core | 1 โปรเซส × 4 แท็บ | ~13.5 นาที |
| neck-gen 48 core (Xeon Gold 6530, LXC) | 1 โปรเซส × 36 แท็บ | **ล้ม** timeout 33 วิ ตอนเปิดแท็บ |
| neck-gen | 1 โปรเซส × 24 แท็บ | 684 วิ (~11.4 นาที) — CPU ว่าง 90%+ |
| neck-gen | 8 โปรเซส × 3 แท็บ | 197 วิ |
| neck-gen | 12 × 4 | 185 วิ |
| neck-gen | **16 × 2** (ค่า default ของ render-chunks.sh) | **~170 วิ** (รวม rsync ไป-กลับ ~176 วิ) RAM ~18 GB |
| neck-gen | 24 × 2 | 168 วิ RAM ~27 GB |

**ทำไมต้องแบ่งช่วง:** Remotion หนึ่งโปรเซสเปิด Chrome ตัวเดียว ทุกแท็บใช้ GPU process (SwiftShader) ร่วมกัน
เพิ่ม `--concurrency` แล้วไปรอคิวที่จุดเดียว `scripts/render-chunks.sh` จึงแบ่งเฟรมเป็นช่วง รันหลายโปรเซสพร้อมกัน (bundle ครั้งเดียว)
render เสียงแยกเป็น wav แล้ว concat ด้วย `-c copy` ผลเทียบกับ render ปกติได้ PSNR ~51 dB (เหมือนกันทางสายตา)
เกิน 16 โปรเซส CPU ยังว่าง ~60% แต่ไม่เร็วขึ้นแล้ว ส่วนที่เหลือคือเวลาเปิด Chrome + โหลดฉากของแต่ละช่วง

ประมาณคลิปยาวบน neck-gen (16×2): 60 วิ ≈ 6–7 นาที, 2 นาที ≈ 12–14 นาที (ยังไม่ได้วัด)

## เครื่อง render ที่มีอยู่: neck-gen `render@172.16.83.67` (48 vCPU / 48 GB)

| รายการ | ค่า |
|---|---|
| vCPU | 48 (host สอง socket → 2×24 + เปิด NUMA) |
| CPU type | `host` (ค่า default `kvm64` ช้าลง 20–40%) |
| RAM | 48 GB ปิด ballooning |
| Disk | 60 GB SSD, VirtIO SCSI, `discard` |
| OS | Ubuntu 26.04 LTS ใน LXC (Proxmox), ไม่มี GPU |
| user | `render` (ไม่มี sudo, อยู่ใน group `render` ที่มีอยู่เดิม) เข้าด้วย key ของเครื่อง dev + key จาก github.com/Neckkup.keys; root เข้าด้วย key ได้ |

```bash
# Ubuntu 26.04 มี nodejs 22 ใน apt แล้ว (24.04 ต้องใช้ nodesource)
sudo apt install -y nodejs npm ffmpeg curl rsync fontconfig \
  libnss3 libdbus-1-3 libatk1.0-0t64 libatk-bridge2.0-0t64 libgbm1 libasound2t64 \
  libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 \
  libpango-1.0-0 libcairo2 libcups2t64
echo -e "render soft nofile 65535\nrender hard nofile 65535\nrender soft nproc 65535\nrender hard nproc 65535" | sudo tee /etc/security/limits.d/render.conf
sudo useradd -m -s /bin/bash -g render render   # ถ้ามี group render อยู่แล้ว (ไม่งั้นตัด -g)   # ใส่ SSH public key ของเครื่อง dev ใน ~render/.ssh/authorized_keys
```

## ใช้งาน

- ตั้ง `CLIP_KUP_HOST=render@172.16.83.67` แล้ว `scripts/render.sh <Composition> [procs=16]` จะ rsync ขึ้นไป, `npm install` ถ้า package.json เปลี่ยน, render แบบแบ่งช่วง แล้วดึงไฟล์กลับมา finalize
- ไม่ตั้ง → render บนเครื่องตัวเองด้วย `nice -n 19` และ concurrency = ครึ่งหนึ่งของ core
- เครื่องใหม่: ลอง procs 8 / 16 / 24 แล้วจดผลลงตารางข้างบน

## ทางเลือกอื่น

- **ภาพระดับ Blender Cycles** (กระจกสะท้อน แสงจริง): ต้องมี GPU → เช่า RunPod/Vast.ai RTX 4090 (~$0.3–0.9/ชม., คลิป 12 วิ ~2–4 ชม. รวมทดสอบ) ใช้ timeline เดิมแต่ต้องเขียนฉากใหม่เป็น Blender Python
- GPU ในเครื่อง Proxmox ที่ VM อื่นใช้ passthrough อยู่ ห้ามไปแตะ

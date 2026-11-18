# เครื่อง render

render แบบ CPU ล้วน (`--gl=swangle`) Chrome หนึ่งตัวกิน ~1–1.5 core และ RAM ~1 GB
ตัวเลขวัดจริงบนเครื่อง 8 core (`--concurrency=4`, มี bloom): คลิป 15 วิ ≈ 7.5 นาที, 24 วิ ≈ 13.5 นาที (~33 วินาทีต่อวินาทีของคลิป)
แถวอื่นในตารางเป็นค่าประมาณ

## เวลาโดยประมาณ (นาที)

| vCPU | RAM | concurrency | 15 วิ | 24 วิ | 60 วิ | 2 นาที |
|---|---|---|---|---|---|---|
| 4 | 8 GB | 3 | ~15 | ~25 | ~60 | ~120 |
| 8 | 8 GB | 6 | ~7 | ~12 | ~30 | ~60 |
| 16 | 16 GB | 12 | ~4 | ~7 | ~17 | ~35 |
| 32 | 32 GB | 24 | ~3 | ~5 | ~12 | ~25 |
| **48** | **48 GB** | **36** | **~2.5** | **~4** | **~10** | **~19** |
| 64 | 56 GB | 48 | ~2.5 | ~3.5 | ~8 | ~16 |
| 128 | 64 GB | 64 | ~2 | ~3 | ~7 | ~13 |

เกิน ~48 core ได้เพิ่มน้อย: การรวม MP4 + เสียงตอนท้ายใช้ core เดียว (~1–2 นาที) และ concurrency เกิน ~64 ไม่ช่วยแล้ว

## สเปกที่ผู้ใช้เลือก (48 vCPU / 48 GB)

| รายการ | ค่า |
|---|---|
| vCPU | 48 (host สอง socket → 2×24 + เปิด NUMA) |
| CPU type | `host` (ค่า default `kvm64` ช้าลง 20–40%) |
| RAM | 48 GB ปิด ballooning |
| Disk | 60 GB SSD, VirtIO SCSI, `discard` |
| OS | Ubuntu Server 24.04 LTS, ไม่ต้องมี GPU |

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg rsync fontconfig \
  libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2t64 \
  libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 \
  libpango-1.0-0 libcairo2 libcups2
echo -e "render soft nofile 65535\nrender hard nofile 65535\nrender soft nproc 65535\nrender hard nproc 65535" | sudo tee /etc/security/limits.d/render.conf
sudo adduser --disabled-password --gecos "" render   # ใส่ SSH public key ของเครื่อง dev ใน ~render/.ssh/authorized_keys
```

## ใช้งาน

- ตั้ง `CLIP_KUP_HOST=render@<ip>` แล้ว `scripts/render.sh <Composition>` จะ rsync ขึ้นไป render (`--concurrency=36`) แล้วดึงไฟล์กลับ
- ไม่ตั้ง → render บนเครื่องตัวเองด้วย `nice -n 19` และ concurrency = ครึ่งหนึ่งของ core
- หลัง render ครั้งแรกบนเครื่องใหม่ ให้เทียบเวลาจริงกับตารางแล้วปรับ concurrency / แก้ตารางนี้

## ทางเลือกอื่น

- **ภาพระดับ Blender Cycles** (กระจกสะท้อน แสงจริง): ต้องมี GPU → เช่า RunPod/Vast.ai RTX 4090 (~$0.3–0.9/ชม., คลิป 12 วิ ~2–4 ชม. รวมทดสอบ) ใช้ timeline เดิมแต่ต้องเขียนฉากใหม่เป็น Blender Python
- GPU ในเครื่อง Proxmox ที่ VM อื่นใช้ passthrough อยู่ ห้ามไปแตะ

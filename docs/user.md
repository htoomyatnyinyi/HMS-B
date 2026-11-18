| Role   | Email                 | Password             |
| ------ | --------------------- | -------------------- |
| Admin  | `admin@clinic.local`  | `AdminPassword123!`  |
| Doctor | `doctor@clinic.local` | `DoctorPassword123!` |

Analyzed docker-compose.yml:L1-76
Analyzed docker-compose.yml:L1-76
Ran delete redundant backend/docker-compose.yml

### ဘာကြောင့် ၂ ခု ဖြစ်နေခဲ့တာလဲ?

ယခင် backend setup လုပ်စဉ်က `backend/` directory အတွင်း terminal မှ command ခေါ်ရန် တစ်ခုနှင့် root directory (`clinic_system/`) မှ စီမံရန် တစ်ခု ပွားမိခဲ့ခြင်း ဖြစ်ပါသည်။

Project တစ်ခုလုံး (Root Level) မှ စီမံခန့်ခွဲနိုင်ရန် root တွင်ရှိသော [docker-compose.yml](file:///Users/htoomyatnyinyi/Desktop/clinic_system/docker-compose.yml) သာ အဓိကထားသင့်ပြီး မလိုအပ်သော **`backend/docker-compose.yml`** ကို ဖျက်ပေးလိုက်ပါပြီ။

---

ယခုအခါ root directory မှနေ၍သာ အောက်ပါအတိုင်း ပုံမှန်အတိုင်း သုံးနိုင်ပါပြီ-

```bash
# PostgreSQL & Adminer စတင်ရန်
docker compose up -d

# ပိတ်ရန်
docker compose down
```

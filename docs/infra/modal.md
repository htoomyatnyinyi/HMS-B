**မဟုတ်ပါဘူးခင်ဗျာ။ လက်ရှိ schema က Multi-tenant (SaaS model) ပုံစံ ဖြစ်နေပါတယ်ခင်ဗျာ။**

အကြောင်းရင်းတွေကတော့ schema ထဲမှာ အောက်ပါအတိုင်း တွေ့ရလို့ပါ -

1. **`model Tenant` ပါနေခြင်း**
   - Organization/Company တစ်ခုချင်းစီကို Tenant အနေနဲ့ ခွဲထားပါတယ်။
2. **Models အများစုမှာ `tenantId` ပါနေခြင်း**
   - `Hospital`
   - `User`
   - `Role`
   - `Patient`
   - `Supplier`
   - `SystemSetting`
   - `Questionnaire`
   - `FhirResource`
   - `ExternalIdentifier`
3. **Hierarchy တည်ဆောက်ပုံ**
   - `Tenant` -> `Hospital` -> `Branch` -> `Department` ဆိုပြီး Multi-hospital / Multi-branch SaaS structure အဖြစ် ရေးဆွဲထားတာ တွေ့ရပါတယ်။

---

### အကယ်၍ သင့် System က **Single Clinic / Single Tenant (Clinic တစ်ခုတည်း သီးသန့်)** အတွက်ပဲ ရည်ရွယ်တာဆိုရင်:

ဒီအတိုင်းထားရင် မလိုအပ်ဘဲ query တိုင်းမှာ `tenantId` တွေလိုက်စစ်ရတာ၊ Foreign Key တွေရှုပ်ထွေးတာမျိုး ဖြစ်နိုင်ပါတယ်။

Single Tenant (Single Clinic) အဖြစ် ပြောင်းချင်ရင်:

1. `model Tenant` ကို ဖြုတ်ပစ်မယ်။
2. အားလုံးမှာပါနေတဲ့ `tenantId` တွေကို ဖယ်ရှားမယ်။
3. ဆေးခန်းအချက်အလက်အတွက် `Clinic` (သို့မဟုတ် `ClinicSetting`) model တစ်ခုတည်းထားမယ်။ (ဆေးခန်းခွဲတွေ မရှိရင် `Branch` ကိုပါ ဖြုတ်နိုင်သလို၊ ဆေးခန်းခွဲ ရှိနိုင်သေးရင် `Branch` ကို ဆက်ထားနိုင်ပါတယ်)။

အကယ်၍ **Single Tenant / Single Clinic သီးသန့်** အဖြစ် ရှင်းရှင်းလင်းလင်း ပြင်ချင်တယ်ဆိုရင် ပြောပေးပါခင်ဗျာ၊ schema ကို Single Clinic structure အဖြစ် ပြန်လည်ရှင်းလင်း ပြင်ဆင်ပေးပါ့မယ်။

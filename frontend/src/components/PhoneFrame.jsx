export default function PhoneFrame({ children, time = '9:41' }) {
  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center py-10">
      <div className="relative bg-white border-[14px] border-black rounded-[3rem] w-[390px] h-[844px] shadow-phone overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-b-[18px] z-30" />
        <div className="flex items-center justify-between px-7 pt-2.5 pb-1.5 text-[13px] font-semibold text-slate-900 relative z-20">
          <span>{time}</span>
          <span className="text-xs">100%</span>
        </div>
        <div className="phone-body h-[calc(100%-38px)] overflow-y-auto bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
}

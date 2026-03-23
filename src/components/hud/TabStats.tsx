import { useState, useEffect } from "react";
import WeekActivityChart from "@/components/shared/WeekActivityChart";
import { StatCard, XPBar } from "@/components/shared/PlayerRow";
import Icon from "@/components/ui/icon";
import { AuthUser, formatTime } from "@/lib/types";

interface TabStatsProps {
  authUser: AuthUser;
  myRank: number;
  isOnline?: boolean;
}

export default function TabStats({ authUser, myRank, isOnline }: TabStatsProps) {
  const [extraSecs, setExtraSecs] = useState(0);

  useEffect(() => {
    if (!isOnline) { setExtraSecs(0); return; }
    const tick = setInterval(() => setExtraSecs(s => s + 1), 1000);
    return () => clearInterval(tick);
  }, [isOnline]);

  const totalSecs = authUser.onlineToday * 60 + extraSecs;
  const displayToday = totalSecs >= 60
    ? formatTime(Math.floor(totalSecs / 60))
    : `${totalSecs}с`;

  const verbalCount    = authUser.penalties.filter(p => p.type === "verbal"    && p.isActive).length;
  const reprimandCount = authUser.penalties.filter(p => p.type === "reprimand" && p.isActive).length;
  const hasPenalties   = verbalCount > 0 || reprimandCount > 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Онлайн сегодня" value={displayToday} icon="Clock" sub="личная" delay={0} />
        <StatCard label="За неделю" value={formatTime(authUser.onlineWeek)} icon="Calendar" sub="7 дней" delay={60} />
        <StatCard label="Репутация" value={authUser.reputation.toLocaleString()} icon="Star" sub={myRank > 0 ? `ТОП ${myRank}` : "—"} delay={120} />
        <StatCard label="Уровень" value={`LVL ${authUser.level}`} icon="TrendingUp" sub={`${authUser.xp}/${authUser.xpMax} XP`} delay={180} />
      </div>

      <WeekActivityChart weekActivity={authUser.weekActivity} />

      {/* Взыскания */}
      <div className="hud-panel p-5 animate-fade-in" style={{ animationDelay: "260ms", animationFillMode: "both" }}>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="ShieldAlert" size={13} className="text-purple-500" />
          <div className="font-hud text-sm tracking-wider text-purple-400">ВЗЫСКАНИЯ</div>
          {!hasPenalties && (
            <span className="ml-auto text-[10px] font-mono-hud text-emerald-600 flex items-center gap-1">
              <Icon name="CheckCircle" size={10} /> Нарушений нет
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Устные предупреждения */}
          <div className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${
            verbalCount === 0 ? "border-purple-900/30 bg-purple-900/10"
            : verbalCount >= 2 ? "border-red-700/40 bg-red-900/10"
            : "border-yellow-700/40 bg-yellow-900/10"
          }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              verbalCount === 0 ? "bg-purple-900/30"
              : verbalCount >= 2 ? "bg-red-900/30"
              : "bg-yellow-900/30"
            }`}>
              <Icon name="MessageSquareWarning" size={15} className={
                verbalCount === 0 ? "text-purple-700"
                : verbalCount >= 2 ? "text-red-400"
                : "text-yellow-400"
              } />
            </div>
            <div>
              <div className="text-[10px] font-hud tracking-widest text-purple-600 mb-0.5">УСТ. ПРЕДУПРЕЖДЕНИЯ</div>
              <div className={`font-hud text-xl ${
                verbalCount === 0 ? "text-purple-800"
                : verbalCount >= 2 ? "text-red-400 neon-red"
                : "text-yellow-300"
              }`}>
                {verbalCount} <span className="text-[11px] font-mono-hud text-purple-700">/ 2</span>
              </div>
            </div>
          </div>

          {/* Выговоры */}
          <div className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${
            reprimandCount === 0 ? "border-purple-900/30 bg-purple-900/10"
            : reprimandCount >= 3 ? "border-red-700/40 bg-red-900/10"
            : reprimandCount >= 2 ? "border-orange-700/40 bg-orange-900/10"
            : "border-yellow-700/40 bg-yellow-900/10"
          }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              reprimandCount === 0 ? "bg-purple-900/30"
              : reprimandCount >= 3 ? "bg-red-900/30"
              : "bg-orange-900/30"
            }`}>
              <Icon name="AlertOctagon" size={15} className={
                reprimandCount === 0 ? "text-purple-700"
                : reprimandCount >= 3 ? "text-red-400"
                : reprimandCount >= 2 ? "text-orange-400"
                : "text-yellow-400"
              } />
            </div>
            <div>
              <div className="text-[10px] font-hud tracking-widest text-purple-600 mb-0.5">ВЫГОВОРЫ</div>
              <div className={`font-hud text-xl ${
                reprimandCount === 0 ? "text-purple-800"
                : reprimandCount >= 3 ? "text-red-400 neon-red"
                : reprimandCount >= 2 ? "text-orange-400"
                : "text-yellow-300"
              }`}>
                {reprimandCount} <span className="text-[11px] font-mono-hud text-purple-700">/ 3</span>
              </div>
            </div>
          </div>
        </div>

        {/* История активных взысканий */}
        {hasPenalties && (
          <div className="mt-4 space-y-1.5">
            {authUser.penalties.filter(p => p.isActive).map(p => {
              const dateStr = (() => {
                try { return new Date(p.issuedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
                catch { return p.issuedAt; }
              })();
              return (
                <div key={p.id} className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border ${
                  p.type === "verbal" ? "bg-yellow-900/10 border-yellow-800/20" : "bg-orange-900/10 border-orange-800/20"
                }`}>
                  <Icon name={p.type === "verbal" ? "MessageSquareWarning" : "AlertOctagon"} size={12}
                    className={`mt-0.5 flex-shrink-0 ${p.type === "verbal" ? "text-yellow-400" : "text-orange-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-hud tracking-wide ${p.type === "verbal" ? "text-yellow-400" : "text-orange-400"}`}>
                        {p.type === "verbal" ? "УСТ. ПРЕДУПРЕЖДЕНИЕ" : "ВЫГОВОР"}
                      </span>
                      <span className="text-[10px] font-mono-hud text-purple-800">от {p.issuedBy} · {dateStr}</span>
                    </div>
                    {p.reason && (
                      <div className="text-[11px] font-mono-hud text-purple-400 mt-0.5">{p.reason}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="hud-panel p-5 animate-fade-in" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
        <div className="font-hud text-sm tracking-wider text-purple-400 mb-4">СИСТЕМА РЕПУТАЦИИ</div>
        <div className="space-y-3.5">
          {[
            { label: "Боевая репутация",    val: 78, color: "xp-bar" },
            { label: "Социальная репутация", val: 52, color: "rep-bar" },
            { label: "Рейтинг надёжности",  val: 91, color: "xp-bar" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-purple-600 font-hud w-44">{item.label}</span>
              <div className="flex-1"><XPBar value={item.val} max={100} color={item.color} /></div>
              <span className="font-mono-hud text-xs text-purple-500 w-8 text-right">{item.val}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
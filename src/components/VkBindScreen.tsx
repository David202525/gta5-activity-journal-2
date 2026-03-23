import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AuthUser } from "@/lib/types";
import { apiGetPlayers, apiEditPlayer } from "@/lib/api";

interface VkBindScreenProps {
  authUser: AuthUser;
  onBound: (user: AuthUser) => void;
  onLogout: () => void;
}

export default function VkBindScreen({ authUser, onBound, onLogout }: VkBindScreenProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const checkBound = async () => {
    setChecking(true);
    setError("");
    try {
      const players = await apiGetPlayers();
      const me = players.find(p => p.id === authUser.id);
      if (me && me.vk_id) {
        onBound({ ...authUser, ...me } as AuthUser);
      } else {
        setAttempts(a => a + 1);
        setError("VK аккаунт ещё не привязан. Привяжи его через беседу ВКонтакте и нажми снова.");
      }
    } catch {
      setError("Ошибка проверки. Попробуй ещё раз.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const players = await apiGetPlayers();
        const me = players.find(p => p.id === authUser.id);
        if (me && me.vk_id) {
          onBound({ ...authUser, ...me } as AuthUser);
        }
      } catch (_e) { /* ждём */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [authUser, onBound]);

  return (
    <div className="hud-scanlines min-h-screen bg-[#09060f] flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-800/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)]">
              <Icon name="Link" size={32} className="text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/30 to-violet-500/20 blur-md -z-10" />
          </div>
          <h1 className="font-hud text-2xl tracking-widest gradient-text text-center">ПРИВЯЗКА VK</h1>
          <p className="font-mono-hud text-[10px] text-purple-400/50 tracking-widest mt-1.5">ОБЯЗАТЕЛЬНАЯ ВЕРИФИКАЦИЯ</p>
        </div>

        <div className="hud-panel p-7 space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-900/20 border border-blue-700/30">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Icon name="User" size={16} className="text-blue-300" />
            </div>
            <div>
              <div className="font-hud text-xs text-blue-300 tracking-wider">{authUser.username}</div>
              <div className="text-[10px] font-mono-hud text-purple-600 mt-0.5">{authUser.title} · Ранг {authUser.rank}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-hud text-[10px] tracking-widest text-purple-400/60 uppercase text-center">
              Как привязать аккаунт
            </div>

            <div className="space-y-2.5">
              {[
                { num: "1", text: "Вступи в беседу сообщества ВКонтакте" },
                { num: "2", text: 'Напиши боту "начать" или нажми кнопку "Привязать аккаунт"' },
                { num: "3", text: `Введи свой ник: ${authUser.username}` },
                { num: "4", text: 'Нажми "Проверить привязку" ниже' },
              ].map(step => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-700/40 border border-violet-600/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="font-hud text-[9px] text-violet-300">{step.num}</span>
                  </div>
                  <p className="text-xs font-mono-hud text-purple-300/70 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-amber-400 font-mono-hud bg-amber-500/8 border border-amber-500/20 px-3 py-2.5 rounded-lg">
              <Icon name="AlertTriangle" size={13} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {attempts === 0 && !error && (
            <div className="flex items-center gap-2 text-[10px] text-purple-600 font-mono-hud">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
              Ожидаю привязку автоматически...
            </div>
          )}

          <button
            onClick={checkBound}
            disabled={checking}
            className="w-full py-3 rounded-xl font-hud text-sm tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)", boxShadow: "0 4px 24px rgba(37,99,235,0.45)" }}
          >
            {checking ? "ПРОВЕРЯЮ..." : "ПРОВЕРИТЬ ПРИВЯЗКУ"}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2 rounded-xl font-hud text-xs tracking-widest text-purple-700 hover:text-purple-500 transition-colors"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
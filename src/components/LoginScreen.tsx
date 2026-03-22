import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AuthUser } from "@/lib/types";
import { apiLogin } from "@/lib/api";

export default function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Введите ник и пароль"); return; }
    setLoading(true); setError("");
    try {
      const user = await apiLogin(username.trim(), password);
      onLogin(user);
    } catch {
      setError("Неверный ник или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hud-scanlines min-h-screen bg-[#09060f] flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-800/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.5)]">
              <Icon name="Zap" size={32} className="text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/30 to-pink-500/20 blur-md -z-10" />
          </div>
          <h1 className="font-hud text-3xl tracking-widest gradient-text text-center">АФК ЖУРНАЛ</h1>
          <p className="font-mono-hud text-[10px] text-purple-400/50 tracking-widest mt-1.5">GTA ACTIVITY HUB v2.0</p>
        </div>

        <div className="hud-panel p-7">
          <div className="font-hud text-[11px] tracking-widest text-purple-400/60 mb-6 text-center uppercase">
            Идентификация участника
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-hud tracking-widest text-purple-300/50 uppercase block mb-2">Ник</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-3 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 transition-all"
                placeholder="Введите ваш ник..."
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-[10px] font-hud tracking-widest text-purple-300/50 uppercase block mb-2">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-purple-800/40 text-purple-100 text-sm px-4 py-3 rounded-xl font-mono-hud focus:outline-none placeholder:text-purple-900/60 transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono-hud bg-red-500/8 border border-red-500/20 px-3 py-2.5 rounded-lg">
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-hud w-full py-3 mt-1 rounded-xl font-hud text-sm tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)", boxShadow: "0 4px 24px rgba(124,58,237,0.45)" }}
            >
              {loading ? "ПРОВЕРКА..." : "ВОЙТИ В СИСТЕМУ"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-purple-900/80 font-mono-hud">
              Доступ предоставляется куратором или администратором
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
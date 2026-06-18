import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";

type InterviewerDialogProps = {
  onClose: () => void;
  onLogin: (code: string) => void;
};

export function InterviewerDialog({ onClose, onLogin }: InterviewerDialogProps) {
  const [code, setCode] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onLogin(code);
  };

  return (
    <motion.div className="overlay center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form
        className="dialog"
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
        onSubmit={handleSubmit}
      >
        <div className="dialog-icon"><KeyRound size={22} /></div>
        <strong>面试官优先通道</strong>
        <span>输入访问码后获得更高额度和优先队列。后端会使用哈希校验和 HttpOnly Cookie。</span>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="AKB-XXXXXXXX" autoFocus />
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button className="primary" type="submit">进入</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

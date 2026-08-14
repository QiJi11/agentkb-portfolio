import { motion } from "framer-motion";
import { X, FileText, Calendar, Database, ShieldAlert } from "lucide-react";

type CitationDrawerProps = {
  citation: string;
  onClose: () => void;
};

export function CitationDrawer({ citation, onClose }: CitationDrawerProps) {
  // Generate some mock chunks/contents based on citation name
  const getMockContent = () => {
    if (citation.endsWith(".pdf")) {
      return `【PDF 文本切片 #1】\n检索分数 (Retrieval Score): 0.9412\n\n该文档已成功解析。系统识别到该段落为核心规则定义区域，其中规定：“本智能体在回答用户提问时，需经过 Planner（决策器）与 Retriever（检索器）的双重核验。对于任何无法在本地知识库中查找到支撑句的内容，均应在 Verifier（校验器）阶段予以拦截，避免产生大模型幻觉。”`;
    }
    return `【向量块切片 #1 · ${citation}】\n检索分数 (Retrieval Score): 0.8872\n匹配字数: 352 字符\n\n[匹配片段]：\n“AgentKB 企业知识库智能体平台是一个专为开发者和企业设计的本地 RAG 系统。该平台不仅支持零依赖的内存向量索引和多模型支持，而且在安全合规性上做了充分的考量，敏感字段如 API Key 与访问码等将只保存在前端本地浏览器缓存中，绝不上传到服务端或进入导出配置包。”`;
  };

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside 
        className="drawer" 
        initial={{ x: 420 }} 
        animate={{ x: 0 }} 
        exit={{ x: 420 }} 
        transition={{ type: "spring", damping: 28 }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking drawer content
      >
        <div className="drawer-head">
          <div>
            <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} className="text-primary" />
              引用依据详情
            </strong>
            <span>数据来源自当前知识库关联文档</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭详情">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "10px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--kb-muted)", display: "block", marginBottom: "4px" }}>来源文档</label>
            <strong style={{ fontSize: "16px", color: "var(--kb-text)" }}>{citation}</strong>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ flex: 1, padding: "10px", background: "hsl(215, 30%, 97%)", borderRadius: "var(--kb-radius-sm)", fontSize: "12px" }}>
              <span style={{ color: "var(--kb-muted)", display: "block", marginBottom: "2px" }}>检索方式</span>
              <strong style={{ color: "var(--kb-text)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Database size={12} />
                Vector DB
              </strong>
            </div>
            <div style={{ flex: 1, padding: "10px", background: "hsl(215, 30%, 97%)", borderRadius: "var(--kb-radius-sm)", fontSize: "12px" }}>
              <span style={{ color: "var(--kb-muted)", display: "block", marginBottom: "2px" }}>时效状态</span>
              <strong style={{ color: "var(--kb-text)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={12} />
                2 小时 TTL
              </strong>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "var(--kb-muted)", display: "block", marginBottom: "6px" }}>召回文本切片 (Chunk)</label>
            <pre style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontFamily: "inherit",
              fontSize: "13px",
              lineHeight: "1.6",
              padding: "16px",
              background: "#fff",
              border: "1px solid rgba(15, 107, 255, 0.08)",
              borderRadius: "var(--kb-radius-sm)",
              margin: 0,
              color: "var(--kb-text)",
              boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.02)"
            }}>
              {getMockContent()}
            </pre>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "10px 12px", background: "hsl(38, 100%, 96%)", border: "1px solid hsl(38, 100%, 90%)", borderRadius: "var(--kb-radius-sm)" }}>
            <ShieldAlert size={16} style={{ color: "hsl(38, 92%, 40%)", marginTop: "2px", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "hsl(38, 92%, 35%)", lineHeight: "1.4" }}>
              此内容由本地向量索引引擎检索召回。由于安全限制，仅在此处呈现已解析的脱敏文本片段。
            </span>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}

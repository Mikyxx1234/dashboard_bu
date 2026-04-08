import { useState } from 'react';
import { Smartphone, Check, X } from 'lucide-react';

function formatWhatsApp(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: *text*
  html = html.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  // Italic: _text_
  html = html.replace(/(?<![\\w])_([^_\n]+)_(?![\\w])/g, '<em>$1</em>');
  // Strikethrough: ~text~
  html = html.replace(/~([^~\n]+)~/g, '<del>$1</del>');
  // Monospace: ```text```
  html = html.replace(/```([^`]+)```/g, '<code style="background:rgba(0,0,0,0.15);padding:2px 4px;border-radius:3px;font-family:monospace;font-size:12px">$1</code>');
  // Inline code: `text`
  html = html.replace(/`([^`\n]+)`/g, '<code style="background:rgba(0,0,0,0.15);padding:1px 3px;border-radius:2px;font-family:monospace;font-size:12px">$1</code>');
  // Variables: {{var}}
  html = html.replace(/\{\{([^}]+)\}\}/g, '<span style="background:rgba(37,99,235,0.25);color:#93c5fd;padding:1px 6px;border-radius:4px;font-size:12px;font-weight:600">{{$1}}</span>');
  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}

export default function WhatsAppPreview({ content, name, onClose }) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4">
        {/* Phone frame */}
        <div className="rounded-[2rem] overflow-hidden shadow-2xl" style={{ border: '3px solid #374151' }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-2" style={{ background: '#075e54' }}>
            <span className="text-white text-xs font-medium">9:41</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-3.5 rounded-full border border-white/60" />
              <div className="w-3.5 h-3.5 rounded-full border border-white/60" />
            </div>
          </div>

          {/* WhatsApp header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#075e54' }}>
            <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#25d366' }}>
              T
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{name || 'Template'}</p>
              <p className="text-white/60 text-xs">online</p>
            </div>
            <Smartphone className="w-4 h-4 text-white/50" />
          </div>

          {/* Chat area */}
          <div
            className="p-4 min-h-[350px] max-h-[450px] overflow-y-auto"
            style={{
              background: '#0b141a',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {/* Sent message bubble */}
            <div className="flex justify-end mb-2">
              <div
                className="relative max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed"
                style={{ background: '#005c4b', color: '#e9edef' }}
              >
                <div
                  className="whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: formatWhatsApp(content) }}
                />
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{time}</span>
                  <Check className="w-3.5 h-3.5" style={{ color: '#53bdeb' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#1f2c34' }}>
            <div
              className="flex-1 rounded-full px-4 py-2 text-sm"
              style={{ background: '#2a3942', color: 'rgba(255,255,255,0.4)' }}
            >
              Mensagem
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#00a884' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.239 1.816-13.239 1.818-.011 7.911z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Label */}
        <p className="text-center text-xs text-slate-500 mt-3">Preview - Visualização aproximada no WhatsApp</p>
      </div>
    </div>
  );
}

export function WhatsAppBubbleInline({ content }) {
  if (!content) return null;
  return (
    <div
      className="relative max-w-full rounded-xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed"
      style={{ background: '#005c4b', color: '#e9edef' }}
    >
      <div
        className="whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: formatWhatsApp(content) }}
      />
      <div className="flex items-center justify-end gap-1 mt-1">
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {`${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`}
        </span>
        <Check className="w-3.5 h-3.5" style={{ color: '#53bdeb' }} />
      </div>
    </div>
  );
}

export { formatWhatsApp };

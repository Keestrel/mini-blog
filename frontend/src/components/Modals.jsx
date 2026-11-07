import React from 'react';
import { User } from 'lucide-react';

export function EditPostModal({ editingPost, setEditingPost, onSave }) {
  if (!editingPost) return null;
  return (
    <div className="modal-backdrop" onClick={() => setEditingPost(null)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Редактировать публикацию</h3>
        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Заголовок"
            value={editingPost.title}
            onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
          />
          <textarea
            rows={4}
            value={editingPost.content}
            onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
            required
          />
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setEditingPost(null)}>Отмена</button>
            <button type="submit" className="primary-btn">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p style={{ color: 'var(--text-muted)', margin: '12px 0 16px', fontSize: '14px' }}>{message}</p>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Отмена</button>
          <button type="button" className="primary-btn" style={{ background: 'var(--danger)' }} onClick={onConfirm}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

export function MembersModal({ isOpen, onClose, chatDetail, currentUserId, onSelectUser }) {
  if (!isOpen || !chatDetail) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Участники чата ({chatDetail.members?.length || 0})</h3>
        <div style={{ maxHeight: '280px', overflowY: 'auto', margin: '16px 0' }}>
          {chatDetail.members?.map((m) => {
            const u = m.user || {};
            const isMe = u.id === currentUserId;
            let statusText = u.is_online ? "В сети" : (u.last_seen ? `Был(а) ${new Date(u.last_seen).toLocaleDateString()}` : "Оффлайн");
            return (
              <div key={m.id || u.id} className="member-list-item" onClick={() => onSelectUser(u.id)}>
                <div>
                  <div style={{ fontWeight: 500 }}>{u.username || u.email} {isMe && "(Вы)"}</div>
                  <div style={{ fontSize: '12px', color: u.is_online ? 'var(--success)' : 'var(--text-muted)' }}>{statusText}</div>
                </div>
                <User size={16} color="var(--text-muted)" />
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export default function PostCard({ post, currentUserId, onOpenAuthor, onEdit, onDelete }) {
  const isAuthor = post.author_id === currentUserId;

  return (
    <div className="post-card">
      <div className="post-header">
        <div>
          <h3>{post.title}</h3>
          <span 
            className="post-author"
            onClick={() => onOpenAuthor(post.author_id)}
          >
            {post.author?.username || post.author?.email}
          </span>
        </div>
        {isAuthor && (
          <div className="post-actions">
            <button className="icon-btn" onClick={() => onEdit(post)} title="Редактировать">
              <Edit2 size={16} />
            </button>
            <button className="icon-btn danger" onClick={() => onDelete(post.id)} title="Удалить">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      <p className="post-body">{post.content}</p>
    </div>
  );
}
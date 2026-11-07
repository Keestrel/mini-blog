import React from 'react';
import { MessageSquare, Plus, Users, User, Home, Settings } from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  chats,
  selectedChat,
  setSelectedChat,
  currentUserId,
  onOpenNewChatModal,
  fetchPosts,
  fetchMyProfile,
}) {
  const getChatDisplayName = (chatData) => {
    if (!chatData) return "";
    if (chatData.is_group) return chatData.title || `Группа #${chatData.id}`;
    if (chatData.members?.length > 0) {
      const otherMember = chatData.members.find(m => m.user_id !== currentUserId);
      if (otherMember?.user) {
        return otherMember.user.username || otherMember.user.email;
      }
    }
    return "Собеседник";
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <MessageSquare size={24} />
          <span>Pero</span>
        </div>
      </div>

      <div className="nav-Mode-switcher">
        <button 
          className={activeTab === 'home' ? 'active' : ''} 
          onClick={() => { setActiveTab('home'); fetchPosts(); }}
        >
          <Home size={16} /> Главная
        </button>
        <button 
          className={activeTab === 'chats' ? 'active' : ''} 
          onClick={() => setActiveTab('chats')}
        >
          <MessageSquare size={16} /> Чаты
        </button>
        <button 
          className={activeTab === 'profile' ? 'active' : ''} 
          onClick={() => { setActiveTab('profile'); fetchMyProfile(); }}
        >
          <User size={16} /> Профиль
        </button>
      </div>

      {activeTab === 'chats' && (
        <>
          <div className="sidebar-actions">
            <button className="new-chat-btn" onClick={onOpenNewChatModal}>
              <Plus size={16} /> Новый чат
            </button>
          </div>
          <div className="chat-list">
            {chats.map((chat) => (
              <div 
                key={chat.id} 
                className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`} 
                onClick={() => setSelectedChat(chat)}
              >
                <div className="chat-avatar">
                  {chat.is_group ? <Users size={20} /> : <User size={20} />}
                </div>
                <div className="chat-title">{getChatDisplayName(chat)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sidebar-footer" style={{ marginTop: activeTab !== 'chats' ? 'auto' : undefined }}>
        <button 
          className={`settings-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} /> Настройки
        </button>
      </div>
    </aside>
  );
}
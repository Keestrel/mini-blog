import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Plus, LogOut, Users, User, Wifi, WifiOff, FileText, Trash2
} from 'lucide-react';

const API_URL = 'http://192.168.1.182:8000';
const WS_URL = 'ws://192.168.1.182:8000';

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number(payload.sub);
  } catch {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token') || '');
  const [currentUserId, setCurrentUserId] = useState(() => getUserIdFromToken(localStorage.getItem('access_token')));
  const [activeTab, setActiveTab] = useState('chats');

  // Авторизация
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Чаты
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatDetail, setChatDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  // Создание чата
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatData, setNewChatData] = useState({ title: '', is_group: false, target_username: '' });
  
  // Состояния для системы тегов (участников беседы)
  const [memberInput, setMemberInput] = useState('');
  const [membersList, setMembersList] = useState([]);

  // Удаление чата
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteForAll, setDeleteForAll] = useState(false);

  // Посты
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (token) {
      setCurrentUserId(getUserIdFromToken(token));
      fetchChats();
    }
  }, [token]);

  useEffect(() => {
    if (!selectedChat || !token) return;
    fetchChatMessages(selectedChat.id);
    fetchChatDetail(selectedChat.id);

    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`${WS_URL}/ws/chats/${selectedChat.id}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onmessage = (event) => {
      try {
        const incomingMessage = JSON.parse(event.data);
        if (incomingMessage.id) {
          setMessages((prev) => prev.some((m) => m.id === incomingMessage.id) ? prev : [...prev, incomingMessage]);
        }
      } catch (err) {}
    };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    return () => ws.close();
  }, [selectedChat, token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
      const bodyPayload = isLoginMode 
        ? { username: authForm.username, password: authForm.password }
        : { username: authForm.username, email: authForm.email, password: authForm.password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        let errorMsg = 'Ошибка авторизации';
        if (typeof data.detail === 'string') errorMsg = data.detail;
        else if (Array.isArray(data.detail)) errorMsg = data.detail.map((err) => err.msg).join('; ');
        throw new Error(errorMsg);
      }

      const receivedToken = data.access_token || data.token;
      if (receivedToken) {
        localStorage.setItem('access_token', receivedToken);
        setToken(receivedToken);
      } else if (!isLoginMode) {
        setIsLoginMode(true);
        setAuthError('Регистрация успешна! Теперь войдите в аккаунт.');
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    if (wsRef.current) wsRef.current.close();
    localStorage.removeItem('access_token');
    setToken('');
    setSelectedChat(null);
    setChats([]);
    setMessages([]);
  };

  const fetchChats = async () => {
    const res = await fetch(`${API_URL}/chats`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return handleLogout();
    if (res.ok) setChats(await res.json());
  };

  const fetchChatDetail = async (chatId) => {
    const res = await fetch(`${API_URL}/chats/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setChatDetail(await res.json());
  };

  const fetchChatMessages = async (chatId) => {
    const res = await fetch(`${API_URL}/chats/${chatId}/messages?limit=100&offset=0`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setMessages(await res.json());
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    const nickname = memberInput.trim();
    if (nickname && !membersList.includes(nickname)) {
        setMembersList([...membersList, nickname]);
        setMemberInput('');
    }
  };

  const removeMember = (nicknameToRemove) => {
    setMembersList(membersList.filter(name => name !== nicknameToRemove));
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    try {
      // Спасаем никнейм, если пользователь ввел текст, но забыл нажать "Добавить"
      let finalMembers = [...membersList];
      const pendingNickname = memberInput.trim();
      if (newChatData.is_group && pendingNickname && !finalMembers.includes(pendingNickname)) {
        finalMembers.push(pendingNickname);
      }

      const query = !newChatData.is_group && newChatData.target_username 
        ? `?target_username=${encodeURIComponent(newChatData.target_username)}` 
        : '';
        
      const res = await fetch(`${API_URL}/chats${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newChatData.is_group ? newChatData.title : 'Личный диалог',
          is_group: newChatData.is_group,
          members: newChatData.is_group ? finalMembers : []
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        let errorMsg = typeof data.detail === 'string' ? data.detail : data.detail?.map(err => err.msg).join('; ');
        alert(errorMsg || 'Ошибка при создании чата. Проверьте схему на бэкенде.');
        return;
      }

      setChats((prev) => [data, ...prev]);
      setSelectedChat(data);
      setShowNewChatModal(false);
      setNewChatData({ title: '', is_group: false, target_username: '' });
      setMembersList([]);
      setMemberInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (e) => {
    e.preventDefault();
    if (!selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/chats/${selectedChat.id}?delete_for_all=${deleteForAll}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok || res.status === 204) {
        setChats(prev => prev.filter(c => c.id !== selectedChat.id));
        setSelectedChat(null);
        setShowDeleteModal(false);
        setDeleteForAll(false);
      } else {
        const data = await res.json();
        alert(data.detail || 'Ошибка при удалении чата');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: messageInput.trim() }));
    setMessageInput('');
  };

  const fetchPosts = async () => {
    const res = await fetch(`${API_URL}/posts`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPosts(await res.json());
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;
    const res = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newPost),
    });
    if (res.ok) {
      setNewPost({ title: '', content: '' });
      fetchPosts();
    }
  };

  const getChatDisplayName = (chatData) => {
    if (!chatData) return "";
    if (chatData.is_group) return chatData.title || `Группа #${chatData.id}`;
    
    if (chatData.members && chatData.members.length > 0) {
      const otherMember = chatData.members.find(m => m.user_id !== currentUserId);
      if (otherMember?.user) {
        return otherMember.user.username || otherMember.user.name || otherMember.user.email;
      }
    }
    return "Неизвестный собеседник";
  };

  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo">
            <MessageSquare size={32} />
            <h1>Pero</h1>
          </div>
          <div className="auth-tabs">
            <button className={isLoginMode ? 'active' : ''} onClick={() => { setIsLoginMode(true); setAuthError(''); }}>Вход</button>
            <button className={!isLoginMode ? 'active' : ''} onClick={() => { setIsLoginMode(false); setAuthError(''); }}>Регистрация</button>
          </div>
          <form onSubmit={handleAuth} className="auth-form">
            {isLoginMode ? (
              <input type="text" placeholder="Логин или Email" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} required />
            ) : (
              <>
                <input type="text" placeholder="Логин (Никнейм)" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} required />
                <input type="email" placeholder="Электронная почта (Email)" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
              </>
            )}
            <input type="password" placeholder="Пароль" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
            {authError && <div className="auth-error">{authError}</div>}
            <button type="submit" className="primary-btn">
              {isLoginMode ? 'Войти в систему' : 'Создать аккаунт'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <MessageSquare size={24} />
            <span>Pero</span>
          </div>
        </div>

        <div className="nav-Mode-switcher">
          <button className={activeTab === 'chats' ? 'active' : ''} onClick={() => setActiveTab('chats')}>
            <MessageSquare size={16} /> Чаты
          </button>
          <button className={activeTab === 'posts' ? 'active' : ''} onClick={() => { setActiveTab('posts'); fetchPosts(); }}>
            <FileText size={16} /> Посты
          </button>
        </div>

        {activeTab === 'chats' ? (
          <>
            <div className="sidebar-actions">
              <button className="new-chat-btn" onClick={() => setShowNewChatModal(true)}>
                <Plus size={16} /> Новый чат
              </button>
            </div>
            <div className="chat-list">
              {chats.map((chat) => (
                <div key={chat.id} className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`} onClick={() => setSelectedChat(chat)}>
                  <div className="chat-avatar">
                    {chat.is_group ? <Users size={20} /> : <User size={20} />}
                  </div>
                  <div className="chat-title">{getChatDisplayName(chat)}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="sidebar-footer" style={activeTab !== 'chats' ? { marginTop: 'auto' } : {}}>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </aside>

      <main className="main-area">
        {activeTab === 'chats' ? (
          selectedChat ? (
            <div className="chat-window">
              <div className="chat-header">
                <div>
                  <h2>{getChatDisplayName(selectedChat)}</h2>
                  <span className="members-count">
                    {chatDetail?.members?.length || 0} участников
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className={`ws-status ${wsConnected ? 'online' : 'offline'}`}>
                    {wsConnected ? <><Wifi size={14} /> В сети</> : <><WifiOff size={14} /> Отключен</>}
                  </div>
                  <button className="secondary-btn" onClick={() => setShowDeleteModal(true)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="messages-container">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                      <div className="message-bubble">
                        {!isMine && (
                          <div className="message-sender">
                            {msg.sender?.username || msg.sender?.email || `User #${msg.sender_id}`}
                          </div>
                        )}
                        <div>{msg.content}</div>
                        <div className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="message-input-bar">
                <input
                  type="text"
                  placeholder="Написать сообщение..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={!wsConnected}
                />
                <button type="submit" disabled={!wsConnected || !messageInput.trim()}>
                  <Send size={20} />
                </button>
              </form>
            </div>
          ) : (
            <div className="empty-chat-state">
              <MessageSquare size={48} />
              <p>Выберите чат, чтобы начать общение</p>
            </div>
          )
        ) : (
          <div className="posts-container">
            <form onSubmit={handleCreatePost} className="post-form">
              <input
                type="text"
                placeholder="Заголовок поста"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              />
              <textarea
                placeholder="Что нового?"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                rows={4}
              />
              <button type="submit" className="primary-btn" style={{ alignSelf: 'flex-start' }}>Опубликовать</button>
            </form>
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <h3>{post.title}</h3>
                    <span className="post-author">{post.author?.username || post.author?.email}</span>
                  </div>
                  <p>{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- МОДАЛЬНЫЕ ОКНА --- */}
      {showNewChatModal && (
        <div className="modal-backdrop" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Создать новый чат</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newChatData.is_group}
                  onChange={(e) => {
                    setNewChatData({ ...newChatData, is_group: e.target.checked });
                    setMembersList([]);
                    setMemberInput('');
                  }}
                />
                Это групповая беседа
              </label>

              {newChatData.is_group ? (
                <>
                  <input
                    type="text"
                    placeholder="Название группы"
                    value={newChatData.title}
                    onChange={(e) => setNewChatData({ ...newChatData, title: e.target.value })}
                  />
                  
                  {/* Контейнер для отображения плашек (тегов) */}
                  <div className="tags-container">
                    {membersList.map(nickname => (
                      <span key={nickname} className="tag-chip">
                        {nickname}
                        <button type="button" onClick={() => removeMember(nickname)}>×</button>
                      </span>
                    ))}
                  </div>

                  {/* Поле для добавления участников */}
                  <div className="add-member-row">
                    <input 
                      placeholder="Никнейм участника" 
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMember(e)}
                    />
                    <button type="button" onClick={handleAddMember} className="secondary-btn">
                      Добавить
                    </button>
                  </div>
                </>
              ) : (
                <input
                  type="text"
                  placeholder="Никнейм собеседника"
                  value={newChatData.target_username}
                  onChange={(e) => setNewChatData({ ...newChatData, target_username: e.target.value })}
                />
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowNewChatModal(false)}>Отмена</button>
                <button type="button" className="primary-btn" onClick={handleCreateChat}>Создать</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Выйти из чата?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Вы действительно хотите покинуть этот диалог?</p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={deleteForAll}
                  onChange={(e) => setDeleteForAll(e.target.checked)}
                />
                Удалить для всех участников
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowDeleteModal(false)}>Отмена</button>
                <button type="button" className="primary-btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={handleDeleteChat}>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
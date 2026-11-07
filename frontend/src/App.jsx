import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, ArrowLeft, Wifi, WifiOff, MessageSquare, User, LogOut, Settings } from 'lucide-react';
import { API_URL, WS_URL, getUserIdFromToken, authHeader, isTokenValid } from './api';
import Sidebar from './components/Sidebar';
import PostCard from './components/PostCard';
import { EditPostModal, ConfirmDeleteModal, MembersModal } from './components/Modals';

export default function App() {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken && isTokenValid(savedToken)) {
      return savedToken;
    }
    localStorage.removeItem('access_token');
    return '';
  });
  const [currentUserId, setCurrentUserId] = useState(() => getUserIdFromToken(localStorage.getItem('access_token')));

  const [activeTab, setActiveTab] = useState('home');
  const [previousTab, setPreviousTab] = useState('home');

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

  const getChatDisplayName = (chatData) => {
    if (!chatData) return '';
    if (chatData.is_group) return chatData.title || `Группа #${chatData.id}`;

    const members = (chatData.members && chatData.members.length > 0)
      ? chatData.members
      : (chatDetail?.id === chatData.id ? chatDetail.members : []);

    if (members && members.length > 0) {
      const otherMember = members.find((m) => m.user_id !== currentUserId);
      if (otherMember?.user) {
        return otherMember.user.username || otherMember.user.email;
      }
    }
    return 'Собеседник';
  };

  // Пользователи и профили
  const [myProfile, setMyProfile] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  // Посты
  const [posts, setPosts] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });

  // Состояния модалок
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [deleteChatForAll, setDeleteChatForAll] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatData, setNewChatData] = useState({ title: '', is_group: false, target_username: '' });
  const [memberInput, setMemberInput] = useState('');
  const [membersList, setMembersList] = useState([]);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleLogout = () => {
    if (wsRef.current) wsRef.current.close();
    localStorage.removeItem('access_token');
    setToken('');
    setCurrentUserId(null);
    setSelectedChat(null);
    setChats([]);
    setMessages([]);
    setMyProfile(null);
    setSelectedUserProfile(null);
  };

  // Проверка валидности токена и фоновый heartbeat
  useEffect(() => {
    if (!token) return;

    if (!isTokenValid(token)) {
      handleLogout();
      return;
    }

    const interval = setInterval(() => {
      if (!isTokenValid(token)) {
        handleLogout();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (token) {
      setCurrentUserId(getUserIdFromToken(token));
      fetchChats();
      fetchMyProfile();
      fetchPosts();
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
        const msg = JSON.parse(event.data);
        if (msg.type === "status_update") {
          setChatDetail(prev => prev ? {
            ...prev,
            members: prev.members.map(m => m.user?.id === msg.user_id ? { ...m, user: { ...m.user, is_online: msg.is_online, last_seen: msg.last_seen || m.user.last_seen } } : m)
          } : prev);
          setSelectedUserProfile(prev => prev?.id === msg.user_id ? { ...prev, is_online: msg.is_online, last_seen: msg.last_seen || prev.last_seen } : prev);
        } else if (msg.id || msg.type === "new_message") {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      } catch (err) {}
    };

    ws.onclose = (event) => {
      setWsConnected(false);
      if (event.code === 1008 || !isTokenValid(token)) {
        handleLogout();
      }
    };

    return () => ws.close();
  }, [selectedChat, token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
      const body = isLoginMode 
        ? { username: authForm.username, password: authForm.password }
        : { username: authForm.username, email: authForm.email, password: authForm.password };
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка авторизации');
      if (data.access_token || data.token) {
        const receivedToken = data.access_token || data.token;
        localStorage.setItem('access_token', receivedToken);
        setToken(receivedToken);
        setCurrentUserId(getUserIdFromToken(receivedToken));
      } else if (!isLoginMode) {
        setIsLoginMode(true);
        setAuthError('Регистрация успешна! Войдите.');
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const fetchChats = async () => {
    const res = await fetch(`${API_URL}/chats`, { headers: authHeader(token) });
    if (res.status === 401) return handleLogout();
    if (res.ok) setChats(await res.json());
  };

  const fetchChatDetail = async (id) => {
    const res = await fetch(`${API_URL}/chats/${id}`, { headers: authHeader(token) });
    if (res.status === 401) return handleLogout();
    if (res.ok) setChatDetail(await res.json());
  };

  const fetchChatMessages = async (id) => {
    const res = await fetch(`${API_URL}/chats/${id}/messages?limit=100&offset=0`, { headers: authHeader(token) });
    if (res.status === 401) return handleLogout();
    if (res.ok) setMessages(await res.json());
  };

  const fetchMyProfile = async () => {
    const res = await fetch(`${API_URL}/users/me`, { headers: authHeader(token) });
    if (res.status === 401) return handleLogout();
    if (res.ok) {
      const data = await res.json();
      setMyProfile(data);
      fetchUserPosts(data.id);
    }
  };

  const openUserProfile = async (userId, fromTab = activeTab) => {
    setPreviousTab(fromTab);
    const res = await fetch(`${API_URL}/users/${userId}`, { headers: authHeader(token) });
    if (res.status === 401) return handleLogout();
    if (res.ok) {
      setSelectedUserProfile(await res.json());
      fetchUserPosts(userId);
      setActiveTab('view_user');
      setShowMembersModal(false);
    }
  };

  const fetchPosts = async () => {
    const res = await fetch(`${API_URL}/posts`, { headers: authHeader(token) });
    if (res.status === 401) return handleLogout();
    if (res.ok) setPosts(await res.json());
  };

  const fetchUserPosts = async (userId) => {
    const res = await fetch(`${API_URL}/posts?author_id=${userId}`, { headers: authHeader(token) });
    if (res.status === 401) return handleLogout();
    if (res.ok) setUserPosts(await res.json());
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;
    const res = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(newPost)
    });
    if (res.status === 401) return handleLogout();
    if (res.ok) {
      setNewPost({ title: '', content: '' });
      fetchPosts();
      if (currentUserId) fetchUserPosts(currentUserId);
    }
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/posts/${editingPost.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ title: editingPost.title, content: editingPost.content })
    });
    if (res.status === 401) return handleLogout();
    if (res.ok) {
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...editingPost } : p));
      setUserPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...editingPost } : p));
      setEditingPost(null);
    }
  };

  const handleDeletePost = async () => {
    const res = await fetch(`${API_URL}/posts/${postToDelete}`, {
      method: 'DELETE',
      headers: authHeader(token)
    });
    if (res.status === 401) return handleLogout();
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== postToDelete));
      setUserPosts(prev => prev.filter(p => p.id !== postToDelete));
      setPostToDelete(null);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: messageInput.trim() }));
    setMessageInput('');
  };

  const handleStartOrOpenChat = (targetUser) => {
    const existing = chats.find(c => !c.is_group && c.members?.some(m => m.user_id === targetUser.id));
    if (existing) {
      setSelectedChat(existing);
      setActiveTab('chats');
      setSelectedUserProfile(null);
    } else {
      setNewChatData({ title: '', is_group: false, target_username: targetUser.username || '' });
      setShowNewChatModal(true);
    }
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    let finalMembers = [...membersList];
    if (newChatData.is_group && memberInput.trim()) finalMembers.push(memberInput.trim());

    const query = !newChatData.is_group && newChatData.target_username 
      ? `?target_username=${encodeURIComponent(newChatData.target_username)}` : '';
    
    const res = await fetch(`${API_URL}/chats${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({
        title: newChatData.is_group ? newChatData.title : 'Личный диалог',
        is_group: newChatData.is_group,
        members: newChatData.is_group ? finalMembers : []
      })
    });
    if (res.status === 401) return handleLogout();
    if (res.ok) {
      const data = await res.json();
      setChats(prev => [data, ...prev]);
      setSelectedChat(data);
      setShowNewChatModal(false);
      setActiveTab('chats');
      setSelectedUserProfile(null);
    }
  };

  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo"><MessageSquare size={32} /><h1>Pero</h1></div>
          <div className="auth-tabs">
            <button className={isLoginMode ? 'active' : ''} onClick={() => setIsLoginMode(true)}>Вход</button>
            <button className={!isLoginMode ? 'active' : ''} onClick={() => setIsLoginMode(false)}>Регистрация</button>
          </div>
          <form onSubmit={handleAuth} className="auth-form">
            <input type="text" placeholder="Логин" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} required />
            {!isLoginMode && <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} required />}
            <input type="password" placeholder="Пароль" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required />
            {authError && <div className="auth-error">{authError}</div>}
            <button type="submit" className="primary-btn">{isLoginMode ? 'Войти' : 'Создать аккаунт'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        chats={chats} 
        selectedChat={selectedChat} 
        setSelectedChat={setSelectedChat} 
        currentUserId={currentUserId} 
        onOpenNewChatModal={() => setShowNewChatModal(true)} 
        fetchPosts={fetchPosts} 
        fetchMyProfile={fetchMyProfile} 
      />

      <main className="main-area">
        {/* Главная лента */}
        {activeTab === 'home' && (
          <div className="posts-container">
            <h2 style={{ marginBottom: '16px' }}>Главная лента</h2>
            <form onSubmit={handleCreatePost} className="post-form">
              <input 
                type="text" 
                placeholder="Заголовок" 
                value={newPost.title} 
                onChange={e => setNewPost({ ...newPost, title: e.target.value })} 
              />
              <textarea 
                placeholder="Что у вас нового?" 
                rows={3} 
                value={newPost.content} 
                onChange={e => setNewPost({ ...newPost, content: e.target.value })} 
                required 
              />
              <button type="submit" className="primary-btn" style={{ alignSelf: 'flex-start' }}>Опубликовать</button>
            </form>
            <div className="posts-list">
              {posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  currentUserId={currentUserId} 
                  onOpenAuthor={id => openUserProfile(id, 'home')} 
                  onEdit={p => setEditingPost(p)} 
                  onDelete={id => setPostToDelete(id)} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Чат */}
        {activeTab === 'chats' && (
          selectedChat ? (
            <div className="chat-window">
              <div className="chat-header">
                <div className="chat-header-info" onClick={() => setShowMembersModal(true)}>
                  <h2>{getChatDisplayName(selectedChat)}</h2>
                  <span className="members-count">{chatDetail?.members?.length || 0} участников (нажмите)</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className={`ws-status ${wsConnected ? 'online' : 'offline'}`}>
                    {wsConnected ? <><Wifi size={14} /> В сети</> : <><WifiOff size={14} /> Отключен</>}
                  </div>
                  <button className="icon-btn danger" onClick={() => setShowDeleteChatModal(true)}><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="messages-container">
                {messages.map(msg => (
                  <div key={msg.id} className={`message-row ${msg.sender_id === currentUserId ? 'mine' : 'theirs'}`}>
                    <div className="message-bubble">
                      {msg.sender_id !== currentUserId && (
                        <div className="message-sender" onClick={() => openUserProfile(msg.sender_id, 'chats')}>
                          {msg.sender?.username || msg.sender?.email}
                        </div>
                      )}
                      <div>{msg.content}</div>
                      <div className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="message-input-bar">
                <input 
                  type="text" 
                  placeholder="Сообщение..." 
                  value={messageInput} 
                  onChange={e => setMessageInput(e.target.value)} 
                  disabled={!wsConnected} 
                />
                <button type="submit" disabled={!wsConnected || !messageInput.trim()}><Send size={18} /></button>
              </form>
            </div>
          ) : (
            <div className="empty-chat-state"><MessageSquare size={48} /><p>Выберите чат для общения</p></div>
          )
        )}

        {/* Мой профиль */}
        {activeTab === 'profile' && (
          <div className="profile-view-wrapper">
            <div className="profile-card-container">
              <div className="post-card profile-header-card">
                <div className="profile-avatar-large"><User size={44} /></div>
                <div>
                  <h2>{myProfile?.username}</h2>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{myProfile?.email}</span>
                </div>
                <div className="profile-details-list" style={{ width: '100%' }}>
                  <div className="profile-detail-row"><span>ID:</span><strong>#{myProfile?.id}</strong></div>
                  <div className="profile-detail-row"><span>Статус:</span><span className="status-badge-online">● В сети</span></div>
                </div>
              </div>

              <form onSubmit={handleCreatePost} className="post-form">
                <input 
                  type="text" 
                  placeholder="Заголовок" 
                  value={newPost.title} 
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })} 
                />
                <textarea 
                  placeholder="Опубликовать в профиль..." 
                  rows={3} 
                  value={newPost.content} 
                  onChange={e => setNewPost({ ...newPost, content: e.target.value })} 
                  required 
                />
                <button type="submit" className="primary-btn" style={{ alignSelf: 'flex-start' }}>Опубликовать</button>
              </form>

              <h3>Мои публикации ({userPosts.length})</h3>
              <div className="posts-list">
                {userPosts.map(p => (
                  <PostCard key={p.id} post={p} currentUserId={currentUserId} onOpenAuthor={() => {}} onEdit={setEditingPost} onDelete={setPostToDelete} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Просмотр чужого профиля */}
        {activeTab === 'view_user' && selectedUserProfile && (
          <div className="chat-window">
            <div className="chat-header">
              <button className="secondary-btn" onClick={() => { setActiveTab(previousTab); setSelectedUserProfile(null); }}>
                <ArrowLeft size={16} /> Назад
              </button>
              <h2>Профиль пользователя</h2>
              <div style={{ width: 40 }} />
            </div>
            <div className="profile-view-wrapper">
              <div className="profile-card-container">
                <div className="post-card profile-header-card">
                  <div className="profile-avatar-large" style={{ background: 'var(--bg-hover)' }}><User size={44} color="var(--text-muted)" /></div>
                  <div>
                    <h2>{selectedUserProfile.username}</h2>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{selectedUserProfile.email}</span>
                  </div>
                  <div className="profile-details-list" style={{ width: '100%' }}>
                    <div className="profile-detail-row"><span>ID:</span><strong>#{selectedUserProfile.id}</strong></div>
                    <div className="profile-detail-row">
                      <span>Статус:</span>
                      <span className={selectedUserProfile.is_online ? 'status-badge-online' : 'status-badge-offline'}>
                        {selectedUserProfile.is_online ? '● В сети' : (selectedUserProfile.last_seen ? `Был(а) ${new Date(selectedUserProfile.last_seen).toLocaleDateString()} в ${new Date(selectedUserProfile.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Оффлайн')}
                      </span>
                    </div>
                  </div>
                  {selectedUserProfile.id !== currentUserId && (
                    <button className="primary-btn" style={{ width: '100%' }} onClick={() => handleStartOrOpenChat(selectedUserProfile)}>
                      <MessageSquare size={18} /> Написать сообщение
                    </button>
                  )}
                </div>

                <h3>Публикации автора ({userPosts.length})</h3>
                <div className="posts-list">
                  {userPosts.map(p => (
                    <PostCard key={p.id} post={p} currentUserId={currentUserId} onOpenAuthor={() => {}} onEdit={setEditingPost} onDelete={setPostToDelete} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && (
          <div className="chat-window">
            <div className="chat-header"><h2>Настройки</h2></div>
            <div className="profile-view-wrapper">
              <div className="post-card settings-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings size={24} color="var(--text-muted)" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>Управление аккаунтом</h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Безопасность и сессия</span>
                  </div>
                </div>
                <button className="danger-action-btn" onClick={handleLogout}>
                  <LogOut size={18} /> Выйти из аккаунта
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Модальные окна */}
      <EditPostModal editingPost={editingPost} setEditingPost={setEditingPost} onSave={handleUpdatePost} />
      <ConfirmDeleteModal 
        isOpen={!!postToDelete} 
        onClose={() => setPostToDelete(null)} 
        onConfirm={handleDeletePost} 
        title="Удалить публикацию?" 
        message="Вы уверены, что хотите удалить эту публикацию? Восстановить ее будет невозможно." 
      />
      <MembersModal 
        isOpen={showMembersModal} 
        onClose={() => setShowMembersModal(false)} 
        chatDetail={chatDetail} 
        currentUserId={currentUserId} 
        onSelectUser={id => openUserProfile(id, 'chats')} 
      />

      {/* Модалка создания чата */}
      {showNewChatModal && (
        <div className="modal-backdrop" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создать чат</h3>
              <button className="icon-btn" onClick={() => setShowNewChatModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateChat} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <label style={{ display: 'flex', gap: '8px', fontSize: '14px', alignItems: 'center' }}>
                <input type="checkbox" checked={newChatData.is_group} onChange={e => setNewChatData({ ...newChatData, is_group: e.target.checked })} style={{ width: 'auto' }} />
                Групповая беседа
              </label>
              {newChatData.is_group ? (
                <>
                  <input type="text" placeholder="Название группы" value={newChatData.title} onChange={e => setNewChatData({ ...newChatData, title: e.target.value })} required />
                  <div className="add-member-row">
                    <input placeholder="Никнейм участника" value={memberInput} onChange={e => setMemberInput(e.target.value)} />
                    <button type="button" className="secondary-btn" onClick={() => { if (memberInput.trim()) { setMembersList([...membersList, memberInput.trim()]); setMemberInput(''); } }}>Добавить</button>
                  </div>
                  <div className="tags-container">
                    {membersList.map((nick, idx) => (
                      <span key={idx} className="tag-chip">{nick} <button type="button" onClick={() => setMembersList(membersList.filter(n => n !== nick))}>×</button></span>
                    ))}
                  </div>
                </>
              ) : (
                <input type="text" placeholder="Никнейм собеседника" value={newChatData.target_username} onChange={e => setNewChatData({ ...newChatData, target_username: e.target.value })} required />
              )}
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowNewChatModal(false)}>Отмена</button>
                <button type="submit" className="primary-btn">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка удаления чата */}
      {showDeleteChatModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteChatModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Выйти из чата?</h3>
            <p style={{ color: 'var(--text-muted)', margin: '12px 0 16px', fontSize: '14px' }}>Покинуть этот диалог?</p>
            <label style={{ display: 'flex', gap: '8px', fontSize: '14px', alignItems: 'center', marginBottom: '16px' }}>
              <input type="checkbox" checked={deleteChatForAll} onChange={e => setDeleteChatForAll(e.target.checked)} style={{ width: 'auto' }} />
              Удалить для всех
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowDeleteChatModal(false)}>Отмена</button>
              <button 
                type="button" 
                className="primary-btn" 
                style={{ background: 'var(--danger)' }} 
                onClick={async () => {
                  await fetch(`${API_URL}/chats/${selectedChat.id}?delete_for_all=${deleteChatForAll}`, { method: 'DELETE', headers: authHeader(token) });
                  setChats(prev => prev.filter(c => c.id !== selectedChat.id));
                  setSelectedChat(null);
                  setShowDeleteChatModal(false);
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
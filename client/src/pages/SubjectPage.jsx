import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

const SubjectPage = () => {
  const { subjectId } = useParams();
  const { user, apiFetch } = useContext(AuthContext);
  const [subjectInfo, setSubjectInfo] = useState(null); // Зберігаємо інфо про предмет
  const [topics, setTopics] = useState([]);
  const [queue, setQueue] = useState([]);
  const [settings, setSettings] = useState(null); // Окремий стан для налаштувань
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Крок 1: Отримуємо теми і базову інфу про предмет
      const topicData = await apiFetch(`/api/topics/subject/${subjectId}`);
      if (!topicData.subject) throw new Error('Предмет не знайдено (topics API)');
      setSubjectInfo(topicData.subject); // Зберігаємо інфо тут
      setTopics(topicData.topics);

      // Крок 2: Отримуємо налаштування предмета
      const settingsData = await apiFetch(`/api/subjects/settings/${subjectId}`);
      setSettings(settingsData);
      
      // Крок 3: Отримуємо і населяємо чергу (якщо вона увімкнена)
      if (settingsData.isQueueEnabled) {
          const queueList = settingsData.queueList || [];
          const populatedQueue = await Promise.all(
            queueList.map(async (entry) => {
              const userId = entry.user;
              try {
                const userData = await apiFetch(`/api/auth/me?userId=${userId}`);
                return { ...entry, user: userData };
              } catch (e) {
                console.error(`Не вдалося завантажити юзера ${userId}`, e);
                return null;
              }
            })
          );
          setQueue(populatedQueue.filter(entry => entry && entry.user));
      } else {
          setQueue([]); // Якщо черга вимкнена, очищуємо її
      }

    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subjectId]);

  if (loading || !subjectInfo) { // Перевіряємо subjectInfo
    return <div>Завантаження предмету...</div>;
  }
  
  // Використовуємо subjectInfo тут
  const isMonitor = user && subjectInfo.group && user._id === subjectInfo.group.monitor;

  return (
    <div>
      <Link to={`/group/${subjectInfo.group._id}`}>Повернутись до групи</Link>
      <h1>{subjectInfo.name}</h1>
      <hr />
      
      {/* ---- ВСТАВЛЯЄМО ПАНЕЛЬ НАЛАШТУВАНЬ ---- */}
        {isMonitor && settings && (
            <SettingsPanel 
                subjectId={subjectId} 
                apiFetch={apiFetch} 
                initialSettings={settings} 
                onSettingsSaved={fetchData} // <--- ДОДАНО: передаємо функцію оновлення
            />
        )}
      {/* ------------------------------------ */}

      {/* --- СЕКЦІЯ ЧЕРГИ --- */}
      {settings && settings.isQueueEnabled ? ( // Перевіряємо settings
        <>
          <h2>Загальна Черга</h2>
          <QueuePanel
            queue={queue}
            subjectId={subjectId}
            apiFetch={apiFetch}
            onDataRefresh={fetchData}
            isMonitor={isMonitor}
            userId={user._id}
            subjectSettings={settings}
          />
          <hr style={{ margin: '20px 0' }} />
        </>
      ) : (
        <p><i>Черга для здачі лаб для цього предмету вимкнена.</i></p>
      )}
      
      {/* --- СЕКЦІЯ ТЕМ --- */}
      <h2>Теми для презентацій/СРС</h2>
      {isMonitor && <CreateTopicPanel subjectId={subjectId} apiFetch={apiFetch} onTopicCreated={fetchData} />}
      {topics.length === 0 ? (
        <p>Для цього предмету ще не додано тем.</p>
      ) : (
        <TopicsList 
          topics={topics} 
          apiFetch={apiFetch} 
          onDataRefresh={fetchData} 
          userId={user._id}
          subjectSettings={settings} // Передаємо settings сюди
        />
      )}
    </div>
  );
};

// ... (решта компонентів: QueuePanel, TopicsList, CreateTopicPanel) ...
// ===========================================
// ======== КОМПОНЕНТ НАЛАШТУВАНЬ ==========
// ===========================================
const SettingsPanel = ({ subjectId, apiFetch, initialSettings, onSettingsSaved }) => {  
  // Функція для отримання безпечних налаштувань
  const getSafeSettings = (settings) => ({
    isQueueEnabled: settings?.isQueueEnabled ?? false,
    allowMultipleEntries: settings?.allowMultipleEntries ?? false,
    maxLabStep: settings?.maxLabStep ?? 0,
  });

  const [settings, setSettings] = useState(getSafeSettings(initialSettings));
  const [isEditing, setIsEditing] = useState(false);
  
  // Цей useEffect тепер просто оновлює стан, коли приходять нові дані
 // useEffect(() => {
   //  setSettings(getSafeSettings(initialSettings));
  //}, [initialSettings]); // Тригер спрацює, коли дані завантажаться

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) : value)
    }));
  };

const handleSave = async () => {
    try {
        await apiFetch(`/api/subjects/settings/${subjectId}`, {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
        alert('Налаштування збережено!');
        setIsEditing(false);
        
        // <--- КЛЮЧОВЕ ВИПРАВЛЕННЯ: оновлюємо дані на сторінці
        if (onSettingsSaved) {
            onSettingsSaved(); 
        }

    } catch (error) {
        alert(`Помилка: ${error.message}`);
    }
};

  return (
    <div style={{ border: '2px dashed #777', padding: '10px', marginBottom: '20px' }}>
      <h3>Панель Старости: Налаштування Предмету</h3>
      {!isEditing ? (
        <div>
          <p>Черга увімкнена: {settings.isQueueEnabled ? 'Так' : 'Ні'}</p> 
          <p>Дозволити декілька записів: {settings.allowMultipleEntries ? 'Так' : 'Ні'}</p>
          <p>Макс. крок здачі лаб (+): {settings.maxLabStep > 0 ? settings.maxLabStep : 'Вимкнено'}</p>
          <button onClick={() => setIsEditing(true)}>Редагувати</button>
        </div>
      ) : (
        <div>
          <div>
            <input type="checkbox" id="isQueueEnabled" name="isQueueEnabled" checked={settings.isQueueEnabled} onChange={handleInputChange} />            <label htmlFor="isQueueEnabled"> Увімкнути чергу?</label>
          </div>
          <div>
            <input type="checkbox" id="allowMultipleEntries" name="allowMultipleEntries" checked={settings.allowMultipleEntries} onChange={handleInputChange} />
            <label htmlFor="allowMultipleEntries"> Дозволити декілька записів у чергу?</label>
          </div>
          <div>
            <label htmlFor="maxLabStep"> Макс. крок здачі (+): </label>
                <input type="number" id="maxLabStep" name="maxLabStep" value={settings.maxLabStep} onChange={handleInputChange} min="0" />            <small> (0 = вимкнено)</small>
          </div>
          <button onClick={handleSave}>Зберегти</button>
          <button onClick={() => setIsEditing(false)}>Скасувати</button>
        </div>
      )}
    </div>
  );
};
// ===========================================
// ============ КОМПОНЕНТ ЧЕРГИ =============
// ===========================================
const QueuePanel = ({ queue, subjectId, apiFetch, onDataRefresh, isMonitor, userId, subjectSettings }) => {  
  const [labInfo, setLabInfo] = useState('');
  
  const isInQueue = queue.some(entry => entry.user._id === userId);

  // ---- ОСЬ ВИПРАВЛЕННЯ: ДОДАЙ ЦЕЙ РЯДОК ----
  const shouldShowJoinForm = !isInQueue || subjectSettings?.allowMultipleEntries;

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/subjects/queue/join', {
        method: 'POST',
        body: JSON.stringify({ subjectId, labInfo }),
      });
      setLabInfo('');
      onDataRefresh();
    } catch (error) {
      console.error('Помилка при спробі запису:', error.message);
      alert(`Помилка: ${error.message}`);
    }
  };
  
  const handleLeave = async () => {
    try {
      await apiFetch(`/api/subjects/queue/leave/${subjectId}`, { method: 'POST' });
      onDataRefresh();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };
  
  const handleNext = async () => {
    try {
      await apiFetch(`/api/subjects/queue/next/${subjectId}`, { method: 'POST' });
      onDataRefresh();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };
  
  const handleRemove = async (userIdToRemove) => {
    try {
      await apiFetch('/api/subjects/queue/remove', {
        method: 'POST',
        body: JSON.stringify({ subjectId, userId: userIdToRemove }),
      });
      onDataRefresh();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };
  
  // ---- НОВА ФУНКЦІЯ ----
  const handleSwap = async (requestedUserId) => {
    try {
      const res = await apiFetch('/api/swap/request', {
        method: 'POST',
        body: JSON.stringify({ subjectId, requestedUserId }),
      });
      alert(res.message);
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };
  // ----------------------

  return (
    <div style={{ border: '1px solid #555', padding: '10px' }}>
      {isMonitor && (
        <div style={{ borderBottom: '1px dashed #555', paddingBottom: '5px', marginBottom: '10px' }}>
          <button onClick={handleNext} disabled={queue.length === 0}>Наступний</button>
        </div>
      )}
      
      {queue.length === 0 ? <p>Черга порожня</p> : (
        <ol>
          {queue.map((entry) => (
            entry.user ? (
              <li key={entry._id}>
                <b>{entry.user.surname} {entry.user.firstName} {entry.user.patronymic}</b>
                <br/>
                <small>Здає: {entry.labInfo}</small>
                
                {/* ---- НОВІ КНОПКИ ---- */}
                {isMonitor && <button onClick={() => handleRemove(entry.user._id)} style={{ marginLeft: '10px' }}>X</button>}
                
                {/* Показуємо "Помінятись", якщо це не ми */}
                {entry.user._id !== userId && (
                  <button onClick={() => handleSwap(entry.user._id)} style={{ marginLeft: '10px', fontSize: '0.8em' }}>
                    Помінятись
                  </button>
                )}
                {/* ------------------ */}
                
              </li>
            ) : null
          ))}
        </ol>
      )}
      
{shouldShowJoinForm && (
            <form onSubmit={handleJoin} style={{ marginTop: '15px' }}>
                <input 
                    type="text" 
                    value={labInfo} 
                    onChange={(e) => setLabInfo(e.target.value)} 
                    placeholder="Що здаєте? (напр. Лаба 1)"
                    required 
                />
                <button type="submit">Записатись</button>
            </form>
        )}

        {/* 2. Leave Button */}
        {isInQueue && (
            <button onClick={handleLeave} style={{ marginTop: '15px' }}>Вийти з черги</button>
        )}
    </div>
  );
};


// ===========================================
// ============ КОМПОНЕНТИ ТЕМ =============
// ===========================================
const TopicsList = ({ topics, apiFetch, onDataRefresh, userId, subjectSettings }) => {
  const myTopic = topics.find(t => t.assignedUsers.some(u => u._id === userId));
  const canSignUp = !myTopic || subjectSettings.allowMultipleTopics;
  
  const handleSign = async (topicId) => {
    try {
      await apiFetch(`/api/topics/signup/${topicId}`, { method: 'POST' });
      onDataRefresh();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };
  
  const handleLeave = async (topicId) => {
    try {
      await apiFetch(`/api/topics/leave/${topicId}`, { method: 'POST' });
      onDataRefresh();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  return (
    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
      {topics.map(topic => {
        const isMy = topic.assignedUsers.some(u => u._id === userId);
        const isFull = topic.assignedUsers.length >= topic.maxSlots;

        return (
          <li key={topic._id} style={{ border: '1px solid #555', padding: '10px', marginBottom: '10px' }}>
            <b>{topic.name}</b>
            <p>Місць: {topic.assignedUsers.length} / {topic.maxSlots}</p>
            <ul>
              {topic.assignedUsers.map(u => <li key={u._id}>{u.firstName} {u.lastName}</li>)}
            </ul>
            
            {isMy ? (
              <button onClick={() => handleLeave(topic._id)}>Відписатись</button>
            ) : (isFull ? (
              <p>Місць немає</p>
            ) : ( canSignUp && (
              <button onClick={() => handleSign(topic._id)}>Записатись</button>
            )))}
          </li>
        );
      })}
    </ul>
  );
};

const CreateTopicPanel = ({ subjectId, apiFetch, onTopicCreated }) => {
  const [name, setName] = useState('');
  const [slots, setSlots] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/topics', {
        method: 'POST',
        body: JSON.stringify({ name, subjectId, maxSlots: slots }),
      });
      alert('Тему створено!');
      setName('');
      setSlots(1);
      onTopicCreated();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  return (
    <div style={{ border: '2px dashed #777', padding: '10px', marginBottom: '20px' }}>
      <h3>Панель Старости: Додати Тему</h3>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Назва теми" 
          required 
        />
        <input 
          type="number" 
          value={slots} 
          onChange={(e) => setSlots(Number(e.target.value))} 
          min="1"
          style={{ width: '60px', marginLeft: '10px' }}
        />
        <button type="submit">Створити тему</button>
      </form>
    </div>
  );
};

export default SubjectPage;
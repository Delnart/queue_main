import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
const GroupPage = () => {
  const { groupId } = useParams();
  const { user, apiFetch } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [managementData, setManagementData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isMonitor = user && group && user._id === group.monitor;

  const fetchGroupData = async () => {
    try {
      const data = await apiFetch(`/api/subjects/group/${groupId}`);
      setGroup(data.group);
      setSubjects(data.subjects);
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchManagementData = async () => {
    if (!isMonitor) return;
    try {
      const data = await apiFetch(`/api/groups/manage/${groupId}`);
      setManagementData(data);
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);
  
  useEffect(() => {
    if (group && isMonitor) {
      fetchManagementData();
    }
  }, [group, isMonitor]);

  if (loading) {
    return <div>Завантаження групи...</div>;
  }

  if (!group) {
    return <div><Link to="/">На Головну</Link><p>Групу не знайдено.</p></div>;
  }

  return (
    <div>
      <Link to="/">На Головну</Link>
      <h1>{group.name}</h1>
      <hr />
      
      {isMonitor && (
        <ManagementPanel 
          group={managementData} 
          apiFetch={apiFetch} 
          onDataRefresh={fetchManagementData} 
        />
      )}
      
      <h2>Предмети</h2>
      {subjects.length === 0 ? (
        <p>Для цієї групи ще не додано предметів.</p>
      ) : (
        <ul>
          {subjects.map(subject => (
            <li key={subject._id}>
              <Link to={`/subject/${subject._id}`}>{subject.name}</Link>
            </li>
          ))}
        </ul>
      )}
      
      {isMonitor && (
        <CreateSubjectPanel 
          groupId={groupId} 
          apiFetch={apiFetch} 
          onSubjectCreated={fetchGroupData} 
        />
      )}
    </div>
  );
};

const ManagementPanel = ({ group, apiFetch, onDataRefresh }) => {
  if (!group) return <div>Завантаження панелі керування...</div>;

  const handleApprove = async (userId) => {
    try {
      await apiFetch('/api/groups/approve-member', {
        method: 'POST',
        body: JSON.stringify({ groupId: group._id, userId }),
      });
      onDataRefresh();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };
  
  const handleReject = async (userId) => {
    try {
      await apiFetch('/api/groups/reject-member', {
        method: 'POST',
        body: JSON.stringify({ groupId: group._id, userId }),
      });
      onDataRefresh();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  return (
    <div style={{ border: '2px dashed #777', padding: '10px', marginBottom: '20px' }}>
      <h3>Панель Старости</h3>
      <h4>Заявки на вступ</h4>
      {group.pendingMembers.length === 0 ? <p>Немає нових заявок.</p> : (
        <ul>
          {group.pendingMembers.map(member => (
            <li key={member._id}>
              {member.firstName} (@{member.username})
              <button onClick={() => handleApprove(member._id)}>Схвалити</button>
              <button onClick={() => handleReject(member._id)}>Відхилити</button>
            </li>
          ))}
        </ul>
      )}
      <h4>Учасники Групи</h4>
      <ul>
        {group.members.map(member => (
          <li key={member._id}>{member.firstName} (@{member.username})</li>
        ))}
      </ul>
    </div>
  );
};

const CreateSubjectPanel = ({ groupId, apiFetch, onSubjectCreated }) => {
  const [name, setName] = useState('');
  const [isQueueEnabled, setIsQueueEnabled] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/subjects', {
        method: 'POST',
        body: JSON.stringify({ name, groupId, isQueueEnabled }),
      });
      alert('Предмет створено!');
      setName('');
      setIsQueueEnabled(false);
      onSubjectCreated();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  return (
    <div>
      <hr />
      <h2>Додати предмет</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Назва предмету" 
          required
        />
        <div style={{ fontSize: '0.8em', margin: '10px 0' }}>
          <input 
            type="checkbox"
            id="queue-toggle"
            checked={isQueueEnabled}
            onChange={(e) => setIsQueueEnabled(e.target.checked)}
          />
          <label htmlFor="queue-toggle"> Увімкнути чергу для здачі лаб?</label>
        </div>
        <button type="submit">Створити предмет</button>
      </form>
    </div>
  );
};

export default GroupPage;
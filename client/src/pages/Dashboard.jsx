import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
const Dashboard = () => {
  const { user, apiFetch, handleLogout } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [pendingGroup, setPendingGroup] = useState(null);

  const fetchData = async () => {
    try {
      const groupsData = await apiFetch('/api/groups/mygroups');
      setGroups(groupsData);
      if (user.role === 'student') {
        const pendingData = await apiFetch('/api/groups/my-pending');
        setPendingGroup(pendingData);
      }
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

// ...
  return (
    <div>
      <h1>Вітаю, {user.firstName}! (Роль: {user.role})</h1>
      <nav>
        <Link to="/profile" style={{ marginRight: '10px' }}>Мій Профіль</Link>
        <button onClick={handleLogout}>Вийти</button>
      </nav>
      <hr />
      
      {/* ---- ОСЬ ЗМІНИ ---- */}
      
      {/* super_admin ЗАВЖДИ бачить свою панель */}
      {user.role === 'super_admin' && <SuperAdminPanel apiFetch={apiFetch} onDataRefresh={fetchData} />}

      {/* Якщо ти 'monitor' АБО 'super_admin', ти бачиш панель старости */}
      {(user.role === 'monitor' || user.role === 'super_admin') && <MonitorPanel />}

      {/* Студент бачить панель студента */}
      {user.role === 'student' && <StudentPanel apiFetch={apiFetch} onDataRefresh={fetchData} groups={groups} pendingGroup={pendingGroup} />}
      
      {/* ------------------ */}
      
      <MyGroupsList groups={groups} />
    </div>
  );
};
// ...
// --- КОМПОНЕНТИ, які були в App.jsx ---

const StudentPanel = ({ apiFetch, onDataRefresh, groups, pendingGroup }) => {
  const hasActiveGroup = groups.length > 0;
  
  if (pendingGroup) {
    return <p>Ваш запит на створення групи "{pendingGroup.name}" очікує на схвалення.</p>;
  }
  if (hasActiveGroup) {
    return <p>Ви є учасником групи.</p>;
  }
  return (
    <div>
      <JoinGroupPanel apiFetch={apiFetch} onGroupJoined={onDataRefresh} />
      <hr />
      <RequestGroupPanel apiFetch={apiFetch} onGroupRequested={onDataRefresh} />
    </div>
  );
};

const MonitorPanel = () => (
  <div>
    <h2>Панель Старости</h2>
    <p>Ви можете керувати своїми групами нижче.</p>
  </div>
);

const SuperAdminPanel = ({ apiFetch, onDataRefresh }) => {
  const [pending, setPending] = useState([]);

  const fetchPending = async () => {
    try {
      const groups = await apiFetch('/api/admin/pending-groups');
      setPending(groups);
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };
  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (groupId) => {
    try {
      await apiFetch(`/api/admin/approve-group/${groupId}`, { method: 'POST' });
      onDataRefresh();
      fetchPending();
    } catch (error) { alert(`Помилка: ${error.message}`); }
  };

  const handleReject = async (groupId) => {
     try {
      await apiFetch(`/api/admin/reject-group/${groupId}`, { method: 'POST' });
      fetchPending();
    } catch (error) { alert(`Помилка: ${error.message}`); }
  };

  return (
    <div>
      <h2>Запити на створення груп</h2>
      {pending.length === 0 ? <p>Немає нових запитів.</p> : (
        <ul>
          {pending.map(group => (
            <li key={group._id}>
              <b>{group.name}</b> (Студент: {group.monitor.firstName} @{group.monitor.username})
              <button onClick={() => handleApprove(group._id)}>Схвалити</button>
              <button onClick={() => handleReject(group._id)}>Відхилити</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const MyGroupsList = ({ groups }) => (
  <div>
    <h2>Мої активні групи</h2>
    {groups.length === 0 ? (
      <p>Ви ще не приєднались до жодної групи.</p>
    ) : (
      <ul>
        {groups.map(group => (
          <li key={group._id}>
            <Link to={`/group/${group._id}`}>{group.name}</Link>
            {group.invitationCode && ` (Код: ${group.invitationCode})`}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const RequestGroupPanel = ({ apiFetch, onGroupRequested }) => {
  const [groupName, setGroupName] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/api/groups/request', {
        method: 'POST',
        body: JSON.stringify({ name: groupName }),
      });
      alert(`Запит на групу "${data.name}" надіслано!`);
      setGroupName('');
      onGroupRequested();
    } catch (error) { alert(`Помилка: ${error.message}`); }
  };

  return (
    <div>
      <h2>...або подати заявку на створення своєї групи</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Бажана назва групи (напр. ІП-11)" />
        <button type="submit">Надіслати запит</button>
      </form>
    </div>
  );
};

const JoinGroupPanel = ({ apiFetch, onGroupJoined }) => {
  const [code, setCode] = useState('');
const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ invitationCode: code }),
      });
      alert(data.message);
      setCode('');
      onGroupJoined();
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Приєднатись до групи</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код запрошення" />
        <button type="submit">Приєднатись</button>
      </form>
    </div>
  );
};

export default Dashboard;
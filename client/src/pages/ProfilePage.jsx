import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
const ProfilePage = () => {
  const { user, apiFetch, fetchUser } = useContext(AuthContext);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [surname, setSurname] = useState(user.surname || '');
  const [patronymic, setPatronymic] = useState(user.patronymic || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName, surname, patronymic }),
      });
      alert('Профіль оновлено!');
      fetchUser(); // Оновлюємо дані юзера в усьому додатку
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  return (
    <div>
      <Link to="/">На Головну</Link>
      <h1>Мій Профіль</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Прізвище:</label>
          <input 
            type="text" 
            value={surname} 
            onChange={(e) => setSurname(e.target.value)}
            placeholder="Ваше прізвище"
          />
        </div>
        <div>
          <label>Ім'я:</label>
          <input 
            type="text" 
            value={firstName} 
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ваше ім'я"
          />
        </div>
        <div>
          <label>По-батькові:</label>
          <input 
            type="text" 
            value={patronymic} 
            onChange={(e) => setPatronymic(e.target.value)}
            placeholder="Ваше по-батькові"
          />
        </div>
        <button type="submit">Зберегти</button>
      </form>
    </div>
  );
};

export default ProfilePage;
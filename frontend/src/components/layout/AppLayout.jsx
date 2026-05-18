import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { getUnreadCount } from '../../api/notifications';

const AppLayout = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getUnreadCount();
        setUnreadCount(data.data?.count || data.data?.unreadCount || 0);
      } catch (error) {
        console.error('Failed to load unread notifications', error);
      }
    };
    fetch();
    const interval = setInterval(fetch, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar unreadCount={unreadCount} />
      <div className="main-content">
        <Header unreadCount={unreadCount} />
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AppLayout;

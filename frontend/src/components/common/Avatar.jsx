const Avatar = ({ user, size = 'md', className = '' }) => {
  const sizeClass = { sm: 'avatar-sm', md: '', lg: 'avatar-lg', xl: 'avatar-xl' }[size] || '';

  const getInitials = (u) => {
    if (!u) return '?';
    if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    if (u.firstName) return u.firstName[0].toUpperCase();
    if (u.name) return u.name[0].toUpperCase();
    return '?';
  };

  const colors = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#06b6d4,#3b82f6)',
    'linear-gradient(135deg,#10b981,#06b6d4)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
  ];

  const colorIndex = user?.firstName
    ? user.firstName.charCodeAt(0) % colors.length
    : 0;

  return (
    <div
      className={`avatar ${sizeClass} ${className}`}
      title={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''}
      style={{ background: colors[colorIndex] }}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt={getInitials(user)} />
      ) : (
        getInitials(user)
      )}
    </div>
  );
};

export default Avatar;

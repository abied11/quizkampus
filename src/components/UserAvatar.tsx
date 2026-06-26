import React from 'react';
import type { User } from '../dbService';

interface UserAvatarProps {
  user: Pick<User, 'name' | 'profilePhotoUrl'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-xl' };

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '' }) => {
  const cls = sizes[size];
  if (user.profilePhotoUrl) {
    return (
      <img
        src={user.profilePhotoUrl}
        alt={user.name}
        className={`${cls} rounded-xl object-cover border border-uir-green-medium/20 ${className}`}
      />
    );
  }
  return (
    <div className={`${cls} rounded-xl bg-uir-green-medium/15 border border-uir-green-medium/20 flex items-center justify-center font-bold text-uir-green-muted ${className}`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
};

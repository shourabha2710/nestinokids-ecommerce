import React from 'react';

const ROLE_STYLES = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-green-100 text-green-700 border-green-200',
  support: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  inventory_manager: 'bg-orange-100 text-orange-700 border-orange-200',
  moderator: 'bg-gray-100 text-gray-700 border-gray-200',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  support: 'Support',
  inventory_manager: 'Inventory Manager',
  moderator: 'Moderator',
};

const StaffRoleBadge = ({ role }) => {
  const style = ROLE_STYLES[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  const label = ROLE_LABELS[role] || role;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${style}`}>
      {label}
    </span>
  );
};

export default StaffRoleBadge;

import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ShoppingBag, FolderTree, ClipboardList, Image, LifeBuoy, Zap } from 'lucide-react';
import DashboardWidget from '../DashboardWidget';

const ACTIONS = [
  { icon: PlusCircle, label: 'Add Product', description: 'Create a new product listing', href: '/products/new', color: 'bg-emerald-500' },
  { icon: ShoppingBag, label: 'Orders', description: 'View and manage orders', href: '/orders', color: 'bg-blue-500' },
  { icon: FolderTree, label: 'Categories', description: 'Organize product categories', href: '/categories', color: 'bg-violet-500' },
  { icon: ClipboardList, label: 'Inventory', description: 'Track stock and variants', href: '/inventory', color: 'bg-cyan-500' },
  { icon: Image, label: 'Banners', description: 'Manage promotional banners', href: '/banners', color: 'bg-rose-500' },
  { icon: LifeBuoy, label: 'Support Tickets', description: 'Handle customer inquiries', href: '/support-tickets', color: 'bg-amber-500' },
];

const ActionCard = ({ icon: Icon, label, description, href, color }) => (
  <Link
    to={href}
    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
        {label}
      </div>
      <div className="text-xs text-gray-400 mt-0.5 truncate">
        {description}
      </div>
    </div>
  </Link>
);

const QuickActionsWidget = React.memo(() => (
  <DashboardWidget
    title="Quick Actions"
    icon={Zap}
    color="bg-indigo-500"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ACTIONS.map((action) => (
        <ActionCard key={action.label} {...action} />
      ))}
    </div>
  </DashboardWidget>
));

export default QuickActionsWidget;

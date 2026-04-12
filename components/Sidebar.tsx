export default function Sidebar() {
  return (
    <div className="sidebar bg-white border-r border-gray-200 p-4">
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Navigation
      </div>
      <ul className="space-y-2">
        <li>
          <a href="/inventory" className="block p-2 rounded hover:bg-gray-50 text-navy font-medium dmsans">
            Inventory
          </a>
        </li>
        <li>
          <a href="/inventory/products" className="block p-2 rounded hover:bg-gray-50 text-navy font-medium dmsans">
            Products
          </a>
        </li>
      </ul>
    </div>
  );
}

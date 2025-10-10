import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Button from './common/Button';
import Select from './common/Select';
import { useApiKeys } from '../hooks/useApiKeys';

const UserManagementPanel: React.FC = () => {
    const { user, users, addUser, updateUser, deleteUser } = useContext(AuthContext);
    const { apiKeys } = useApiKeys(user);

    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [formState, setFormState] = useState({ username: '', password: '', role: 'user', apiKeyId: '' });
    const [error, setError] = useState('');

    if (user?.role !== 'admin') {
        return <p className="text-gray-400">You do not have permission to manage users.</p>;
    }

    const clearForm = () => {
        setEditingUserId(null);
        setFormState({ username: '', password: '', role: 'user', apiKeyId: '' });
        setError('');
    };

    const handleSelectForEdit = (u: Omit<typeof users[0], 'password'>) => {
        setEditingUserId(u.id);
        setFormState({ username: u.username, password: '', role: u.role, apiKeyId: u.apiKeyId || '' });
    };

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formState.username || (!editingUserId && !formState.password)) {
            setError('Username and password are required for new users.');
            return;
        }

        try {
            if (editingUserId) {
                const updates: any = { role: formState.role, apiKeyId: formState.apiKeyId };
                if (formState.password) { // Only update password if a new one is entered
                    updates.password = formState.password;
                }
                 if(formState.username !== users.find(u => u.id === editingUserId)?.username) {
                    updates.username = formState.username;
                 }
                updateUser(editingUserId, updates);
            } else {
                addUser({
                    username: formState.username,
                    password: formState.password,
                    role: formState.role as 'user' | 'admin' | 'manager',
                    apiKeyId: formState.apiKeyId,
                });
            }
            clearForm();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                deleteUser(userId);
                if (editingUserId === userId) clearForm();
            } catch (err: any) {
                setError(err.message);
            }
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="font-bold mb-3">{editingUserId ? 'Edit User' : 'Add New User'}</h4>
                <form onSubmit={handleSaveUser} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <input name="username" type="text" placeholder="Username" value={formState.username} onChange={handleFormChange} className="w-full p-2 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none" />
                         <input name="password" type="password" placeholder={editingUserId ? "New Password (Optional)" : "Password"} value={formState.password} onChange={handleFormChange} className="w-full p-2 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none" />
                         <Select name="role" value={formState.role} onChange={handleFormChange}>
                             <option value="user">User</option>
                             <option value="manager">Manager</option>
                             <option value="admin">Admin</option>
                         </Select>
                         <Select name="apiKeyId" value={formState.apiKeyId} onChange={handleFormChange}>
                            <option value="">— Assign API Key —</option>
                            {apiKeys.map(key => <option key={key.id} value={key.id}>{key.name}</option>)}
                         </Select>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button type="submit">{editingUserId ? 'Update User' : 'Add User'}</Button>
                         {editingUserId && <Button variant="ghost" type="button" onClick={clearForm}>Cancel Edit</Button>}
                    </div>
                </form>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="font-bold mb-2">Existing Users</h4>
                <div className="flow-root">
                    <ul role="list" className="divide-y divide-white/10">
                        {users.map((u) => (
                            <li key={u.id} className="py-3 grid grid-cols-4 gap-4 items-center">
                                <p className="text-sm font-medium text-white truncate">{u.username}</p>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ u.role === 'admin' ? 'bg-purple-200 text-purple-800' : u.role === 'manager' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800' }`}>
                                    {u.role}
                                </span>
                                <p className="text-sm text-gray-400 truncate">{apiKeys.find(k => k.id === u.apiKeyId)?.name || 'No Key'}</p>
                                <div className="text-right space-x-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={() => handleSelectForEdit(u)}>Edit</Button>
                                    <Button variant="warn" className="!text-xs !px-2 !py-1" onClick={() => handleDeleteUser(u.id)} disabled={u.id === user.id}>
                                        Remove
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default UserManagementPanel;

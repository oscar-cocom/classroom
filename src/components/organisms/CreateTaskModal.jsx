import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { saveTask } from '@/services/firestoreApi';

export function CreateTaskModal({ isOpen, onClose, onTaskCreated, editingTask }) {
  const [formData, setFormData] = useState({
    name: '',
    requirement: '',
    sprint: 1,
    deadline: '',
    maxScore: 50,
    keywords: '',
    matchCount: 1,
    template: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setFormData({
        name: editingTask.name || '',
        requirement: editingTask.requirement || '',
        sprint: editingTask.sprint || 1,
        deadline: editingTask.deadline ? new Date(editingTask.deadline).toISOString().substring(0, 16) : '',
        maxScore: editingTask.maxScore || 50,
        keywords: editingTask.evaluation?.keywords?.join(', ') || '',
        matchCount: editingTask.evaluation?.matchCount || 1,
        template: editingTask.template || ''
      });
    } else {
      setFormData({
        name: '',
        requirement: '',
        sprint: 1,
        deadline: '',
        maxScore: 50,
        keywords: '',
        matchCount: 1,
        template: ''
      });
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const newTask = {
      id: editingTask ? editingTask.id : `t${Date.now()}-sprint${formData.sprint}`,
      sprint: parseInt(formData.sprint),
      name: formData.name,
      requirement: formData.requirement,
      dateAssigned: editingTask ? editingTask.dateAssigned : new Date().toISOString(),
      deadline: new Date(formData.deadline).toISOString(),
      maxScore: parseInt(formData.maxScore),
      template: formData.template,
      evaluation: {
        strategy: "keyword",
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        matchCount: parseInt(formData.matchCount)
      }
    };

    try {
      await saveTask(newTask);
      onTaskCreated();
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Error al guardar la tarea");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Tarea</label>
              <input required type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ej: Tarea 1: Imágenes" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sprint</label>
              <input required type="number" min="1" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.sprint} onChange={e => setFormData({...formData, sprint: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Requisito (Descripción corta)</label>
            <input required type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ej: Uso de etiqueta <img>" value={formData.requirement} onChange={e => setFormData({...formData, requirement: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Límite</label>
              <input required type="datetime-local" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Puntuación Máxima</label>
              <input required type="number" min="1" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.maxScore} onChange={e => setFormData({...formData, maxScore: e.target.value})} />
            </div>
          </div>

          <div className="border p-4 rounded-md space-y-4 bg-muted/20">
            <h3 className="font-semibold text-sm">Evaluación Automática (Palabras Clave)</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">Palabras Clave (separadas por coma)</label>
              <input required type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ej: <img, src, alt" value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} />
              <p className="text-xs text-muted-foreground">El robot buscará estas palabras en los archivos .html y .js del alumno.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Coincidencias Mínimas Requeridas</label>
              <input required type="number" min="1" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.matchCount} onChange={e => setFormData({...formData, matchCount: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Plantilla de Código (Opcional)</label>
            <textarea className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" placeholder="Pega aquí el bloque de código de ejemplo que verán los alumnos..." value={formData.template} onChange={e => setFormData({...formData, template: e.target.value})} />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : editingTask ? 'Guardar Cambios' : 'Guardar Tarea'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

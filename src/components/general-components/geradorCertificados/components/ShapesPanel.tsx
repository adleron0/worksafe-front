import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Square, Circle, Triangle, Minus, EyeOff } from 'lucide-react';
import { ShapeSettings } from '../types';
import * as fabric from 'fabric';

interface ShapesPanelProps {
  shapeSettings: ShapeSettings;
  selectedShape: fabric.Object | null;
  onAddShape: (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line') => void;
  onUpdateSettings: (newSettings: Partial<ShapeSettings>) => void;
  onDragStart: (e: React.DragEvent, shapeType: string) => void;
  onDragEnd: () => void;
}

const ShapesPanel: React.FC<ShapesPanelProps> = ({
  shapeSettings,
  selectedShape,
  onAddShape,
  onUpdateSettings,
  onDragStart,
  onDragEnd
}) => {
  console.log('🔶 ShapesPanel render');
  console.log('🔶 shapeSettings:', shapeSettings);
  console.log('🔶 selectedShape:', selectedShape);
  const shapes = [
    { type: 'rectangle' as const, icon: Square, label: 'Quadrado' },
    { type: 'circle' as const, icon: Circle, label: 'Círculo' },
    { type: 'triangle' as const, icon: Triangle, label: 'Triângulo' },
    { type: 'line' as const, icon: Minus, label: 'Linha' }
  ];

  return (
    <div className="space-y-6">
      {/* Shape buttons */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Formas Geométricas</h3>
          <div className="grid grid-cols-2 gap-2">
            {shapes.map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="h-20 flex flex-col gap-2"
                onClick={() => onAddShape(type)}
                draggable
                onDragStart={(e) => onDragStart(e, type)}
                onDragEnd={onDragEnd}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </Card>
      
      {/* Shape settings */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">
            {selectedShape ? 'Editando Forma' : 'Configurações'}
          </h3>
          {selectedShape && (
            <p className="text-xs text-muted-foreground">
              Altere as propriedades da forma selecionada
            </p>
          )}
          
          {/* Fill color */}
          <div>
            <label className="text-xs font-medium mb-1 block">Cor de Preenchimento</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={shapeSettings.fill === 'transparent' ? '#ffffff' : shapeSettings.fill}
                onChange={(e) => {
                  console.log('Changing fill color to:', e.target.value);
                  onUpdateSettings({ fill: e.target.value });
                }}
                className="flex-1 h-8 rounded cursor-pointer"
                title={shapeSettings.fill === 'transparent' ? 'Transparente' : shapeSettings.fill}
                disabled={shapeSettings.fill === 'transparent'}
              />
              <button
                type="button"
                onClick={() => {
                  const newFill = shapeSettings.fill === 'transparent' ? '#000000' : 'transparent';
                  console.log('Toggling fill:', newFill);
                  onUpdateSettings({ fill: newFill });
                }}
                className={`h-6 w-6 rounded border flex items-center justify-center transition-colors ${
                  shapeSettings.fill === 'transparent'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'
                }`}
                title={shapeSettings.fill === 'transparent' ? 'Ativar preenchimento' : 'Remover preenchimento'}
              >
                <EyeOff className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Stroke color */}
          <div>
            <label className="text-xs font-medium mb-1 block">Cor da Borda</label>
            <input
              type="color"
              value={shapeSettings.stroke}
              onChange={(e) => {
                console.log('Changing stroke color to:', e.target.value);
                onUpdateSettings({ stroke: e.target.value });
              }}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>
          
          {/* Stroke width */}
          <div>
            <label className="text-xs font-medium mb-1 block">
              Espessura da Borda: {shapeSettings.strokeWidth}px
            </label>
            <Slider
              value={[shapeSettings.strokeWidth]}
              onValueChange={(value) => {
                console.log('Changing stroke width to:', value[0]);
                onUpdateSettings({ strokeWidth: value[0] });
              }}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
          
          {/* Opacity */}
          <div>
            <label className="text-xs font-medium mb-1 block">
              Opacidade: {shapeSettings.opacity}%
            </label>
            <Slider
              value={[shapeSettings.opacity]}
              onValueChange={(value) => {
                console.log('Changing opacity to:', value[0]);
                onUpdateSettings({ opacity: value[0] });
              }}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
          
          {/* Border radius - Only show for rectangles */}
          {selectedShape && (selectedShape.type === 'rect' || (selectedShape as any).name === 'rectangle') && (
            <div>
              <label className="text-xs font-medium mb-1 block">
                Arredondamento: {shapeSettings.cornerRadius || 0}px
              </label>
              <Slider
                value={[shapeSettings.cornerRadius || 0]}
                onValueChange={(value) => {
                  console.log('Changing corner radius to:', value[0]);
                  onUpdateSettings({ cornerRadius: value[0] });
                }}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ShapesPanel;
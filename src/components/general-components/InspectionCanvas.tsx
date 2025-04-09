import React, { useRef, useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Stage, Layer, Rect, Label, Text, Image as KonvaImage, Group } from 'react-konva';
import useImage from 'use-image';
// import { Button } from '../ui/button';
import { OctagonAlert, LoaderCircle } from 'lucide-react';

interface Point {
  id: string;
  name: string;
  image?: string;
  x: number;
  y: number;
}

interface InspectionCanvasProps {
  imageUrl: string;
  points: Point[];
  onPointClick: (point: Point) => void;
  onAddPoint: (point: { x: number; y: number }) => void;
  insertMode: boolean;
}

const InspectionCanvas: React.FC<InspectionCanvasProps> = ({
  imageUrl,
  points = [],
  onPointClick,
  onAddPoint,
  insertMode = false,
}) => {
  const [image] = useImage(imageUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const groupRef = useRef<any>(null);

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [groupPosition, setGroupPosition] = useState({ x: 0, y: 0 });
  const [isInsertMode, setIsInsertMode] = useState(insertMode);

  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isPinching, setIsPinching] = useState(false); // Novo estado para gerenciar pinch
  const [lastDist, setLastDist] = useState<number>(0);

  const [loadedImages, setLoadedImages] = useState<{ [key: string]: HTMLImageElement | null }>({});

  const [primaryColor, setPrimaryColor] = useState('');

  useEffect(() => {
    // Pega a cor primária diretamente do CSS
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    setPrimaryColor(`hsl(${primaryColor})`);
  }, []);

  // Função para carregar imagens
  const loadImages = async () => {
    const newImages: { [key: string]: HTMLImageElement | null } = {};
    for (const point of points) {
      const img = new window.Image();
      if (!point.image) continue;
      img.src = point.image;
      await new Promise((resolve) => {
        img.onload = () => {
          newImages[point.id] = img;
          resolve(null);
        };
        img.onerror = (err) => {
          console.error(`Erro ao carregar a imagem ${point.image}`, err);
          newImages[point.id] = null; // Fallback para null em caso de erro
          resolve(null);
        };
      });
    }
    setLoadedImages(newImages);
  };

  useEffect(() => {
    loadImages();
  }, [points]);

  const updateDimensions = () => {
    if (containerRef.current && image) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;

      const scaleX = containerWidth / image.width;
      const scaleY = containerHeight / image.height;
      const scaleFactor = Math.max(scaleX, scaleY);

      const imageWidth = image.width * scaleFactor;
      const imageHeight = image.height * scaleFactor;
      const x = (containerWidth - imageWidth) / 2;
      const y = (containerHeight - imageHeight) / 2;

      setStageSize({
        width: containerWidth,
        height: containerHeight,
      });

      setScale(scaleFactor);
      setMinScale(scaleFactor);
      setGroupPosition({ x, y });
    }
  };

  useEffect(() => {
    if (image && containerRef.current) {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [image]);

  useEffect(() => {
    const container = stageRef.current?.container();
    if (container) {
      container.style.cursor = isInsertMode ? 'crosshair' : 'default';
    }
  }, [isInsertMode]);

  const limitGroupPosition = (newPos: { x: number; y: number }, newScale: number) => {
    if (!image) return newPos;

    const groupWidth = image.width * newScale;
    const groupHeight = image.height * newScale;

    const stageWidth = stageSize.width;
    const stageHeight = stageSize.height;

    let x = newPos.x;
    let y = newPos.y;

    // Limitar x
    if (groupWidth <= stageWidth) {
      x = (stageWidth - groupWidth) / 2;
    } else {
      const minX = stageWidth - groupWidth;
      const maxX = 0;
      x = Math.max(Math.min(x, maxX), minX);
    }

    // Limitar y
    if (groupHeight <= stageHeight) {
      y = (stageHeight - groupHeight) / 2;
    } else {
      const minY = stageHeight - groupHeight;
      const maxY = 0;
      y = Math.max(Math.min(y, maxY), minY);
    }

    return { x, y };
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - groupPosition.x) / oldScale,
      y: (pointer.y - groupPosition.y) / oldScale,
    };

    const scaleBy = 1.05;
    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    newScale = Math.max(minScale, Math.min(5, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    const limitedPos = limitGroupPosition(newPos, newScale);

    setScale(newScale);
    setGroupPosition(limitedPos);
  };

  // Funções auxiliares para o pinch zoom
  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  const handleTouchStart = (e: any) => {
    if (e.evt.touches.length === 2) {
      e.evt.preventDefault();
      setIsPinching(true); // Inicia o gesto de pinch
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const stage = stageRef.current;
      const stageBox = stage.container().getBoundingClientRect();

      const p1 = {
        x: touch1.clientX - stageBox.left,
        y: touch1.clientY - stageBox.top,
      };
      const p2 = {
        x: touch2.clientX - stageBox.left,
        y: touch2.clientY - stageBox.top,
      };
      setLastDist(getDistance(p1, p2));
    }
  };

  const handleTouchMove = (e: any) => {
    if (isPinching && e.evt.touches.length === 2) {
      e.evt.preventDefault();
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const stage = stageRef.current;
      const stageBox = stage.container().getBoundingClientRect();

      const p1 = {
        x: touch1.clientX - stageBox.left,
        y: touch1.clientY - stageBox.top,
      };
      const p2 = {
        x: touch2.clientX - stageBox.left,
        y: touch2.clientY - stageBox.top,
      };

      const newDist = getDistance(p1, p2);

      if (!lastDist) {
        setLastDist(newDist);
        return;
      }

      const distRatio = newDist / lastDist;
      let newScale = scale * distRatio;
      newScale = Math.max(minScale, Math.min(5, newScale));

      const center = getCenter(p1, p2);

      const pointTo = {
        x: (center.x - groupPosition.x) / scale,
        y: (center.y - groupPosition.y) / scale,
      };

      const newPos = {
        x: center.x - pointTo.x * newScale,
        y: center.y - pointTo.y * newScale,
      };

      const limitedPos = limitGroupPosition(newPos, newScale);

      setScale(newScale);
      setGroupPosition(limitedPos);

      setLastDist(newDist);
    }
  };

  const handleTouchEnd = (e: any) => {
    if (e.evt.touches.length < 2) {
      setIsPinching(false); // Finaliza o gesto de pinch
      setLastDist(0);
    }
  };

  const handleDragMove = (e: any) => {
    if (!isPinching) {
      const newPos = { x: e.target.x(), y: e.target.y() };
      setGroupPosition(newPos);
    }
  };

  const handleMouseEnter = () => {
    const container = stageRef.current?.container();
    if (container) {
      container.style.cursor = isInsertMode ? 'crosshair' : 'default';
    }
  };

  const handleMouseLeave = () => {
    const container = stageRef.current?.container();
    if (container) {
      container.style.cursor = 'default';
    }
  };

  const handleMouseDown = () => {
    const container = stageRef.current?.container();
    if (container && !isInsertMode && !isPinching) {
      container.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = () => {
    const container = stageRef.current?.container();
    if (container && !isInsertMode && !isPinching) {
      container.style.cursor = 'default';
    }
  };

  const handleAddPoint = () => {
    if (!image) return;
    if (!isInsertMode) return;

    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const x = (pointer.x - groupPosition.x) / (image.width * scale);
    const y = (pointer.y - groupPosition.y) / (image.height * scale);

    if (x >= 0 && y >= 0 && x <= 1 && y <= 1) {
      onAddPoint({ x, y });
    }

    setIsInsertMode(false);
  };

  const handlePointSelect = (point: Point) => {
    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition && containerRef.current) {
      const newX = pointerPosition.x + 10; // Deslocamento para a direita
      const newY = pointerPosition.y + 5;  // Deslocamento para baixo
      console.log(`Menu Position: (${newX}, ${newY})`); // Para depuração
      setMenuPosition({
        x: newX,
        y: newY,
      });
      setSelectedPoint(point);
    }
  };

  const renderPoints = () => {
    if (!image) return;

    const pinSize = 25;
    return points.map((point) => {
      const pointImage = loadedImages[point.id];
      const x = groupPosition.x + point.x * image.width * scale;
      const y = groupPosition.y + point.y * image.height * scale;

      return (
        <Label
          key={point.id}
          x={x}
          y={y}
          // draggable={!isPinching}
          // onDragEnd={(e) => {
          //   if (!isPinching) {
          //     const pos = {
          //       x: (e.target.x() - groupPosition.x) / (image.width * scale),
          //       y: (e.target.y() - groupPosition.y) / (image.height * scale),
          //     };
          //     onPointClick({ ...point, x: pos.x, y: pos.y });
          //   }
          // }}
          onClick={() => handlePointSelect(point)}
          onTap={() => handlePointSelect(point)}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              container.style.cursor = 'pointer';
            }
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              container.style.cursor = isInsertMode ? 'crosshair' : 'default';
            }
          }}
        >
          {pointImage ? (
            <KonvaImage
              image={pointImage}
              width={pinSize}
              height={pinSize}
              offsetX={pinSize / 2}
              offsetY={pinSize / 2}
              shadowBlur={5}
              cornerRadius={5}
            />
          ) : (
            <>
              <Rect
                width={pinSize}
                height={pinSize}
                fill={primaryColor}
                shadowBlur={5}
                cornerRadius={5}
                offsetX={pinSize / 2}
                offsetY={pinSize / 2}
              />
              <Text
                text={`${point.id}`}
                fontSize={pinSize / 2}
                fill="white"
                align="center"
                verticalAlign="middle"
                width={pinSize}
                height={pinSize}
                offsetX={pinSize / 2}
                offsetY={pinSize / 2}
              />
            </>
          )}
        </Label>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-muted overflow-hidden relative"
    >
      {/* <Button
        onClick={() => setIsInsertMode(true)}
        variant="default"
        className="absolute top-0 left-0 p-2 text-white z-10"
      >
        Inserir Marcador
      </Button> */}
      {stageSize.width > 0 && stageSize.height > 0 ? (
        <>
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <Layer>
              <Group
                ref={groupRef}
                x={groupPosition.x}
                y={groupPosition.y}
                scale={{ x: scale, y: scale }}
                draggable={!isPinching} // Desabilita o drag durante o pinch
                dragBoundFunc={(pos) => limitGroupPosition(pos, scale)}
                onDragStart={() => {
                  if (!isPinching) {
                    const container = stageRef.current?.container();
                    if (container && !isInsertMode) {
                      container.style.cursor = 'grabbing';
                    }
                  }
                }}
                onDragEnd={() => {
                  if (!isPinching) {
                    const container = stageRef.current?.container();
                    if (container && !isInsertMode) {
                      container.style.cursor = 'default';
                    }
                  }
                }}
                onDragMove={handleDragMove}
              >
                {image ? (
                  <KonvaImage
                    image={image}
                    width={image.width}
                    height={image.height}
                  />
                ) : (
                  <Text text="Carregando imagem ou imagem não disponível" />
                )}
              </Group>
              {/* Renderize os pinos fora do Group para que mantenham seu tamanho */}
              {renderPoints()}
              {/* Overlay para inserção de pontos */}
              {isInsertMode && (
                <Rect
                  x={0}
                  y={0}
                  width={stageSize.width}
                  height={stageSize.height}
                  fill="rgba(0, 0, 0, 0.5)"
                  onClick={handleAddPoint}
                  onTap={handleAddPoint}
                />
              )}
            </Layer>
          </Stage>
          {/* Renderize o DropdownMenu fora do canvas */}
          {selectedPoint && (
            <DropdownMenu open={!!selectedPoint} onOpenChange={(open) => !open && setSelectedPoint(null)}>
              <DropdownMenuTrigger asChild>
                <div
                  style={{
                    position: 'absolute',
                    top: menuPosition.y,
                    left: menuPosition.x,
                    width: '0',
                    height: '0',
                    pointerEvents: 'none', // Permite que cliques passem através deste elemento
                  }}
                >
                  {/* Elemento invisível apenas para posicionamento */}
                  <></>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-40'
                sideOffset={5}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1000, // Garante que o menu esteja acima de outros elementos
                }}
              >
                <DropdownMenuLabel>{selectedPoint.name}</DropdownMenuLabel> {/* Exibe o nome da área */}
                <p className='text-2xs -mt-2 px-2'>Descrição simples com últimas informações</p>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <button
                    onClick={() => {
                      onPointClick(selectedPoint);
                      setSelectedPoint(null);
                    }}
                    className="flex items-center gap-2 cursor-pointer w-full"
                  >
                    <OctagonAlert className='h-4 w-4'/>
                    <p>Ação</p> {/* Exibe uma ação com o nome da área */}
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      ) : (
        <div
          className='w-full h-full flex justify-center items-center'
        >
          <LoaderCircle className="animate-spin rounded-full h-16 w-16 text-background/80" />
        </div>
      )}
    </div>
  );
};

export default InspectionCanvas;

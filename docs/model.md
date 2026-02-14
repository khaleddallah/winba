# Tnode
- id : Integer
- parent : tnode 0..1
- children : tnode 0..N

# MApp -> Tnode
- mwindows : MWindow 0..N
- activeWindowId : String


# MWindow -> Tnode
- movable : Boolean
- resizable : Boolean
- bounds: Bounds
- boundsLimits: BoundsLimits
- zIndex : Integer
- mtabs : MTab 0..N
// if not mtabs, then window is invisible


# MTab -> Tnode
- title : String
- visible : Boolean
- active : Boolean
- component : String
// if not title, then title is invisible



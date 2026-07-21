"use client"

import { useState, useRef, useEffect } from "react"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ProductComboboxProps {
  value: string
  onValueChange: (productId: string, productName?: string) => void
  products: Product[]
  placeholder?: string
  showStock?: boolean
}

export function ProductCombobox({
  value,
  onValueChange,
  products,
  placeholder = "Sélectionner un produit",
  showStock = true,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [newName, setNewName] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedProduct = products.find((p) => p.id === value)
  const isNewMode = value === "__new__"

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  function selectProduct(product: Product) {
    onValueChange(product.id, product.name)
    setOpen(false)
    setSearch("")
    toast.success(`${product.name} sélectionné`)
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange("")
    setNewName("")
  }

  return (
    <div ref={ref} className="relative">
      {isNewMode ? (
        <div className="flex items-center gap-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              if (newName.trim()) {
                onValueChange("__new__", newName.trim())
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                if (newName.trim()) {
                  onValueChange("__new__", newName.trim())
                }
              }
            }}
            placeholder="Nom du produit"
            className="h-9 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clearSelection}
            className="shrink-0 h-9 w-9"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : selectedProduct ? (
        <div
          className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm cursor-pointer"
          onPointerDown={(e) => {
            e.stopPropagation()
            setOpen(!open)
          }}
        >
          <Check className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 font-medium">{selectedProduct.name}</span>
          {showStock && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {selectedProduct.quantity}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onPointerDown={(e) => {
              e.stopPropagation()
              onValueChange("")
              setNewName("")
            }}
            className="shrink-0 h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between h-9 text-muted-foreground font-normal"
          onPointerDown={(e) => {
            e.stopPropagation()
            setOpen(!open)
          }}
        >
          <span className="truncate">{placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      )}

      {open && !isNewMode && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && search && (
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 text-primary text-sm"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onValueChange("__new__", search)
                  setOpen(false)
                  setSearch("")
                }}
              >
                <Plus className="h-4 w-4" />
                Créer &quot;{search}&quot;
              </Button>
            )}
            {filtered.length === 0 && !search && (
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground text-sm"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  setNewName("")
                  onValueChange("__new__", "")
                }}
              >
                <Plus className="h-4 w-4" />
                Nouveau produit
              </Button>
            )}
            {filtered.map((product) => (
              <Button
                key={product.id}
                type="button"
                variant="ghost"
                className={cn(
                  "w-full justify-between text-sm h-auto py-2",
                  value === product.id && "bg-muted"
                )}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  selectProduct(product)
                }}
              >
                <span className="truncate">{product.name}</span>
                {showStock && (
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                    {product.quantity}
                  </Badge>
                )}
              </Button>
            ))}
            {filtered.length > 0 && (
              <>
                <div className="my-1 h-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground text-sm"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    setNewName("")
                    onValueChange("__new__", "")
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Nouveau produit
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronDown, Plus, X, Search } from "lucide-react"
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [newName, setNewName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const selectedProduct = products.find((p) => p.id === value)
  const isNewMode = value === "__new__"

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function selectProduct(product: Product) {
    onValueChange(product.id, product.name)
    setSheetOpen(false)
    setSearch("")
    toast.success(`${product.name} sélectionné`)
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange("")
    setNewName("")
  }

  function startCreate(name: string) {
    setIsCreating(true)
    setNewName(name)
  }

  function confirmCreate() {
    if (newName.trim()) {
      onValueChange("__new__", newName.trim())
      setSheetOpen(false)
      setNewName("")
      setIsCreating(false)
      setSearch("")
    }
  }

  function closeSheet() {
    setSheetOpen(false)
    setSearch("")
    setNewName("")
    setIsCreating(false)
  }

  return (
    <>
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
          onClick={() => setSheetOpen(true)}
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
          onClick={() => setSheetOpen(true)}
        >
          <span className="truncate">{placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      )}

      {sheetOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col" onPointerDown={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60" onClick={closeSheet} />
          <div className="absolute bottom-0 left-0 right-0 bg-popover rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-base">{placeholder}</h3>
              <Button type="button" variant="ghost" size="icon-sm" onClick={closeSheet} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="h-10 pl-9 text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4" style={{ touchAction: "pan-y" }}>
              {filtered.length === 0 && search && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 text-primary text-sm h-12"
                  onClick={() => startCreate(search)}
                >
                  <Plus className="h-4 w-4" />
                  Créer &quot;{search}&quot;
                </Button>
              )}
              {filtered.length === 0 && !search && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground text-sm h-12"
                  onClick={() => startCreate("")}
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
                    "w-full justify-between text-sm h-auto py-3",
                    value === product.id && "bg-muted"
                  )}
                  onClick={() => selectProduct(product)}
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
                  <div className="my-2 h-px bg-border" />
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground text-sm h-12"
                    onClick={() => startCreate("")}
                  >
                    <Plus className="h-4 w-4" />
                    Nouveau produit
                  </Button>
                </>
              )}
            </div>

            {isCreating && (
              <div className="border-t border-border px-4 py-3 flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom du nouveau produit"
                  className="h-10 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmCreate() } }}
                />
                <Button type="button" onClick={confirmCreate} disabled={!newName.trim()} className="h-10 px-4">
                  OK
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

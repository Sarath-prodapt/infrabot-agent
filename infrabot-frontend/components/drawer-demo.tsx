"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from "@/components/ui/drawer"

export default function DrawerDemo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Drawer</Button>

      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <DrawerContent>
          <DrawerHeader>
            <h3 className="text-lg font-medium">Drawer Title</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DrawerHeader>
          <DrawerBody>
            <p>This is a custom drawer component that doesn't rely on any legacy dependencies.</p>
            <p className="mt-4">It supports:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Click outside to close</li>
              <li>ESC key to close</li>
              <li>Different positions (left, right, top, bottom)</li>
              <li>Smooth animations</li>
              <li>Backdrop overlay</li>
            </ul>
          </DrawerBody>
          <DrawerFooter>
            <Button onClick={() => setIsOpen(false)}>Close Drawer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

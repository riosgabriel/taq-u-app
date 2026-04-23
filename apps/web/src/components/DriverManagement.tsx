import React, { useState } from "react"
import { Driver } from "../types/driver"
import DriverEdit from "./DriverEdit"
import DriverList from "./DriverList"

const DriverManagement: React.FC = () => {
  const [currentView, setCurrentView] = useState<"list" | "edit" | "create">("list")
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>()

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriverId(driver.id)
    setCurrentView("edit")
  }

  const handleCreateDriver = () => {
    setSelectedDriverId(undefined)
    setCurrentView("create")
  }

  const handleSaveDriver = () => {
    setCurrentView("list")
    setSelectedDriverId(undefined)
  }

  const handleCancelEdit = () => {
    setCurrentView("list")
    setSelectedDriverId(undefined)
  }

  return (
    <>
      {currentView === "list" && (
        <DriverList
          onEditDriver={handleEditDriver}
          onCreateDriver={handleCreateDriver}
        />
      )}
      {(currentView === "edit" || currentView === "create") && (
        <DriverEdit
          driverId={selectedDriverId}
          onSave={handleSaveDriver}
          onCancel={handleCancelEdit}
        />
      )}
    </>
  )
}

export default DriverManagement

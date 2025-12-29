"""
Windows Service Wrapper for Sync Agent
======================================
This script installs the sync agent as a Windows Service
that starts automatically and restarts on failure.

Run as Administrator:
    python install_service.py install
    python install_service.py start
"""

import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
import sys
import os
import time
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class SyncAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "InventorySyncAgent"
    _svc_display_name_ = "Inventory Sync Agent"
    _svc_description_ = "Syncs inventory data from local SQL Server to cloud database"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.running = True
        socket.setdefaulttimeout(60)

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.running = False

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        self.main()

    def main(self):
        from sync_agent import SyncAgent
        
        try:
            agent = SyncAgent()
            
            while self.running:
                try:
                    # Sync cycle
                    inventory = agent.fetch_inventory_from_sql()
                    agent.sync_inventory_to_cloud(inventory)
                    agent.check_pending_transfers()
                    agent.log_sync('incremental', 'completed', len(inventory))
                    
                except Exception as e:
                    servicemanager.LogErrorMsg(f"Sync error: {str(e)}")
                    agent.log_sync('incremental', 'failed', 0, str(e))
                
                # Check if stop requested
                if win32event.WaitForSingleObject(self.hWaitStop, agent.sync_interval * 1000) == win32event.WAIT_OBJECT_0:
                    break
                    
        except Exception as e:
            servicemanager.LogErrorMsg(f"Fatal error: {str(e)}")


if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(SyncAgentService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(SyncAgentService)

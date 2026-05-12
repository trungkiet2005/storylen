from asyncio import Event, Lock
from typing import List

from PIL import Image
from pydantic import BaseModel

from manga_translator import Config
from server.sent_data_internal import fetch_data_stream, NotifyType, fetch_data

class ExecutorInstance(BaseModel):
    ip: str
    port: int
    busy: bool = False

    def _get_headers(self) -> dict:
        """Get headers with nonce for internal communication"""
        from server.nonce_storage import get_nonce
        nonce = get_nonce()
        if nonce:
            return {"X-Nonce": nonce}
        return {}

    def free_executor(self):
        self.busy = False

    async def sent(self, image: Image, config: Config):
        return await fetch_data("http://"+self.ip+":"+str(self.port)+"/simple_execute/translate", image, config, self._get_headers())

    async def sent_stream(self, image: Image, config: Config, sender: NotifyType):
        await fetch_data_stream("http://"+self.ip+":"+str(self.port)+"/execute/translate", image, config, sender, self._get_headers())

    async def sent_batch(self, images: List[Image.Image], config: Config, batch_size: int):
        """Send batch translation request"""
        # translate_batch expects images_with_configs as List[tuple] = [(image, config), ...]
        images_with_configs = [(img, config) for img in images]
        return await fetch_data("http://"+self.ip+":"+str(self.port)+"/simple_execute/translate_batch",
                               {"images_with_configs": images_with_configs, "batch_size": batch_size}, self._get_headers())

    async def sent_batch_stream(self, images: List[Image.Image], config: Config, batch_size: int, sender: NotifyType):
        """Send batch translation streaming request"""
        # translate_batch expects images_with_configs as List[tuple] = [(image, config), ...]
        images_with_configs = [(img, config) for img in images]
        await fetch_data_stream("http://"+self.ip+":"+str(self.port)+"/execute/translate_batch",
                               {"images_with_configs": images_with_configs, "batch_size": batch_size}, config, sender, self._get_headers())

class Executors:
    def __init__(self):
        self.list: List[ExecutorInstance] = []
        self.lock: Lock = Lock()
        self.event = Event()

    def register(self, instance: ExecutorInstance):
        self.list.append(instance)

    def free_executors(self) -> int:
        return len([item for item in self.list if not item.busy])

    async def _find_instance(self):
        while True:
            instance = next((x for x in self.list if x.busy == False), None)
            if instance is not None:
                return instance
            #todo: cricial error: warn should never happen
            await self.event.wait()

    async def find_executor(self) -> ExecutorInstance:
        async with self.lock:  # Using async with for lock management
            instance = await self._find_instance()
            instance.busy = True
            return instance

    async def free_executor(self, instance: ExecutorInstance):
        from server.myqueue import task_queue
        instance.free_executor()
        self.event.set()
        self.event.clear()
        await task_queue.update_event()

executor_instances: Executors = Executors()

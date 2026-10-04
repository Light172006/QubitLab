import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base
from app.models import *

print(f"Tables registered in Base.metadata: {list(Base.metadata.tables.keys())}")

import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: String,
    required: true,
    default: () => new Date().toISOString()
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  _id: false // Disable automatic _id for subdocuments
});

const ColumnSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  tasks: {
    type: [TaskSchema],
    default: []
  }
}, {
  _id: false // Disable automatic _id for subdocuments
});

const KanbanBoardSchema = new mongoose.Schema({
  whiteboard: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  columns: {
    type: Map,
    of: ColumnSchema,
    required: true,
    validate: {
      validator: function(columnsMap: Map<string, any>) {
        // Ensure we have the required columns
        const requiredColumns = ['todo', 'inProgress', 'done'];
        return requiredColumns.every(colId => columnsMap.has(colId));
      },
      message: 'Kanban board must have todo, inProgress, and done columns'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We handle timestamps manually
});

// Indexes for better query performance
KanbanBoardSchema.index({ whiteboard: 1 });
KanbanBoardSchema.index({ updatedAt: -1 });

// Update the updatedAt field before saving
KanbanBoardSchema.pre('save', function(next: any) {
  this.updatedAt = new Date();
  next();
});

// Update the updatedAt field before updating
KanbanBoardSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next: any) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to safely convert Map to Object for JSON serialization
KanbanBoardSchema.statics.convertMapToObject = function(columnsMap: Map<string, any>) {
  if (!columnsMap || !(columnsMap instanceof Map)) {
    return null;
  }
  
  try {
    return Object.fromEntries(columnsMap);
  } catch (error) {
    console.error('Error converting Map to Object:', error);
    return null;
  }
};

// Static method to safely convert Object to Map for MongoDB storage
KanbanBoardSchema.statics.convertObjectToMap = function(columnsObj: Record<string, any>) {
  if (!columnsObj || typeof columnsObj !== 'object') {
    return null;
  }
  
  try {
    return new Map(Object.entries(columnsObj));
  } catch (error) {
    console.error('Error converting Object to Map:', error);
    return null;
  }
};

const KanbanBoard = mongoose.model('KanbanBoard', KanbanBoardSchema);

export default KanbanBoard;
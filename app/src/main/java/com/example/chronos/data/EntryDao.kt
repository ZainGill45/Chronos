package com.example.chronos.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface EntryDao {
    @Insert
    suspend fun insert(entry: Entry): Long

    @Query("SELECT * FROM entries ORDER BY hour_start_epoch_millis DESC, id DESC")
    fun observeAll(): Flow<List<Entry>>
}

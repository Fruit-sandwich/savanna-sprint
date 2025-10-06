if not state then state = {} end
if not state.submissions then state.submissions = {} end

local json = require("json")

local function asset_exists(assetId)
  for _, sub in ipairs(state.submissions) do
    if sub.AssetId == assetId then return true end
  end
  return false
end

Handlers.add(
  "submit",
  Handlers.utils.hasMatchingTag("Action", "submit"),
  function(msg)
    print("Received submit message: " .. json.encode(msg))

    -- Try decoding submission payload
    local submission = {}
    if msg.Data and type(msg.Data) == "string" then
      local ok, parsed = pcall(json.decode, msg.Data)
      if ok and type(parsed) == "table" then
        submission = parsed
      else
        print("JSON decode failed: " .. tostring(parsed))
        msg.reply({
          Tags = { Action = "submit_result", ["X-Reference"] = msg.Id },
          Data = json.encode({ status = "error", message = "Invalid JSON data" })
        })
        return
      end
    end

    -- Require AssetId
    local assetId = submission.AssetId or msg.AssetId
    if not assetId then
      print("Missing AssetId")
      msg.reply({
        Tags = { Action = "submit_result", ["X-Reference"] = msg.Id },
        Data = json.encode({ status = "error", message = "Missing AssetId" })
      })
      return
    end

    -- Check for duplicates
    if asset_exists(assetId) then
      print("Duplicate AssetId: " .. assetId)
      msg.reply({
        Tags = { Action = "submit_result", ["X-Reference"] = msg.Id },
        Data = json.encode({ status = "duplicate", message = "Duplicate submission rejected" })
      })
      return
    end

    -- Construct new submission
    local new_submission = {
      AssetId = assetId,
      BazarUrl = submission.BazarUrl or msg.BazarUrl,
      Virtue = submission.Virtue or msg.Virtue,
      Title = submission.Title or "Untitled",
      Description = submission.Description or "",
      ContentType = submission.ContentType or "image/jpeg",
      Creator = submission.Creator or "Anonymous",
      Timestamp = os.time(),
      Sender = msg.From
    }

    table.insert(state.submissions, new_submission)
    print("Submission stored: " .. json.encode(new_submission))

    msg.reply({
      Tags = { Action = "submit_result", ["X-Reference"] = msg.Id },
      Data = json.encode({ status = "ok", message = "Submission received" })
    })
  end
)

-- Expose state (new way)
Handlers.add("ExposeState", Handlers.utils.hasMatchingTag("Action", "~patch@1.0"), function(msg)
  msg.reply({
    Tags = { Action = "state", ["X-Reference"] = msg.Id },
    Data = json.encode({ submissions = state.submissions or {} })
  })
end)
